import {
  db,
  owner,
  guard,
  put,
  readData,
  readTables,
  weekly,
  failure,
} from "@/lib/server";
import {
  schemas,
  Table,
  TABLES,
  Row,
  macros,
  foodMacros,
  today,
  navyBF,
  profile,
  canonicalId,
  type MealItemInput,
} from "@/lib/body";
// The app polls this route every minute. meal_items repeats what meals[].items
// already carry, and old chat turns are only needed for a full export.
const RECENT_CHATS = 30;
export async function GET(req: Request) {
  try {
    const user = owner(req),
      data = await weekly(user, await readData(user));
    if (new URL(req.url).searchParams.get("scope") !== "all") {
      data.meal_items = [];
      data.ai_conversations = [...data.ai_conversations]
        .sort((a, b) =>
          String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")),
        )
        .slice(0, RECENT_CHATS);
    }
    // A fingerprint of the response lets the minute-by-minute check answer
    // "nothing changed" with an empty 304 instead of the whole history.
    const body = JSON.stringify(data),
      digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(user + "\n" + body),
      ),
      etag = `"${[...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("")}"`;
    const headers = {
      "Cache-Control": "no-store",
      "X-BodyOS-Owner": encodeURIComponent(user),
      ETag: etag,
    };
    if (req.headers.get("if-none-match") === etag)
      return new Response(null, { status: 304, headers });
    return new Response(body, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    guard(req);
    const user = owner(req);
    if (Number(req.headers.get("content-length")) > 100000)
      throw Error("Registro muito grande");
    const {
      table,
      data: input,
      mutationId,
      baseVersion,
      expectedOwner,
    } = (await req.json()) as {
      table: Table;
      data: Row;
      mutationId?: string;
      baseVersion?: string | null;
      expectedOwner?: string;
    };
    if (expectedOwner && expectedOwner !== user)
      return Response.json(
        {
          error:
            "Conta diferente. Entre na conta que criou os registros pendentes.",
        },
        { status: 403 },
      );
    if (
      mutationId &&
      (!/^[a-zA-Z0-9-]{16,80}$/.test(mutationId) ||
        (baseVersion !== null && typeof baseVersion !== "string"))
    )
      throw Error("Identificador de sincronização inválido");
    if (!schemas[table]) throw Error("Tipo de registro inválido");
    const parsed = schemas[table]!.safeParse(input);
    if (!parsed.success)
      throw Error(
        parsed.error.issues
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join("; "),
      );
    const data = { ...parsed.data, createdAt: new Date().toISOString() };
    if (table !== "competition_events" && data.date > today())
      throw Error("Não registre medições no futuro");
    data.id = canonicalId(table, data);
    const statements: D1PreparedStatement[] = [];
    const write = (target: Table, row: Row) => {
      if (!mutationId) return put(target, user, row);
      return db()
        .prepare(
          `INSERT INTO ${target} (id,user_id,date,payload) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM ${table} WHERE id=? AND user_id=? AND json_extract(payload,'$._mutationId')=?) ON CONFLICT(id,user_id) DO UPDATE SET date=excluded.date,payload=excluded.payload`,
        )
        .bind(
          row.id,
          user,
          row.date,
          JSON.stringify(row),
          data.id,
          user,
          mutationId,
        );
    };
    if (mutationId) {
      const existing = await db()
        .prepare(`SELECT payload FROM ${table} WHERE id=? AND user_id=?`)
        .bind(data.id, user)
        .first<{ payload: string }>();
      if (existing && JSON.parse(existing.payload)._mutationId === mutationId)
        return Response.json({ ok: true, id: data.id, replayed: true });
      data._mutationId = mutationId;
    }
    if (table === "meals") {
      const { foods } = await readTables(user, ["foods"]);
      data.items = data.items.map((item: MealItemInput) => {
        const f = foods.find((x) => x.id === item.foodId);
        if (!f) throw Error("Alimento não encontrado");
        return {
          ...item,
          id: `${data.id}-item-${data.items.indexOf(item)}`,
          date: data.date,
          name: f.name,
          ...foodMacros(f, item.grams),
        };
      });
      Object.assign(data, macros(data.items));
      statements.push(
        db()
          .prepare(
            "DELETE FROM meal_items WHERE user_id=? AND json_extract(payload,'$.mealId')=?" +
              (mutationId
                ? ` AND EXISTS (SELECT 1 FROM meals WHERE id=? AND user_id=? AND json_extract(payload,'$._mutationId')=?)`
                : ""),
          )
          .bind(
            ...(mutationId
              ? [user, data.id, data.id, user, mutationId]
              : [user, data.id]),
          ),
        ...data.items.map((x: Row) =>
          write("meal_items", { ...x, mealId: data.id }),
        ),
      );
    } else if (table === "daily_checkins") {
      statements.push(
        write("sleep_logs", {
          id: "sleep-" + data.date,
          date: data.date,
          hours: data.hours,
          quality: data.quality,
          bedtime: data.bedtime,
          waketime: data.waketime,
        }),
      );
    } else if (table === "body_measurements") {
      if (data.abdomen <= data.neck)
        throw Error("Abdômen deve ser maior que pescoço");
      const height = profile(await readTables(user, ["users"])).height;
      const bf = height ? navyBF(height, data.abdomen, data.neck) : null;
      statements.push(
        ...(bf === null
          ? []
          : [
              write("body_metrics", {
                id: "navy-" + data.date,
                date: data.date,
                bf,
                method: "Circunferências (US Navy)",
              }),
            ]),
      );
    }
    const primary = mutationId
      ? db()
          .prepare(
            `INSERT INTO ${table} (id,user_id,date,payload) SELECT ?,?,?,? WHERE ? IS NULL OR EXISTS (SELECT 1 FROM ${table} WHERE id=? AND user_id=? AND json_extract(payload,'$.createdAt')=?) ON CONFLICT(id,user_id) DO UPDATE SET date=excluded.date,payload=excluded.payload WHERE coalesce(json_extract(${table}.payload,'$.createdAt'),'')=coalesce(?,'')`,
          )
          .bind(
            data.id,
            user,
            data.date,
            JSON.stringify(data),
            baseVersion,
            data.id,
            user,
            baseVersion,
            baseVersion,
          )
      : put(table, user, data);
    const result = await db().batch([primary, ...statements]);
    if (!result[0].meta.changes)
      return Response.json(
        {
          error:
            "Este registro mudou no servidor. Revise a versão atual antes de reenviar.",
        },
        { status: 409 },
      );
    return Response.json({ ok: true, id: data.id });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    guard(req);
    const user = owner(req),
      { table, id } = (await req.json()) as { table: Table; id: string };
    // The profile and settings are edited, never deleted.
    if (
      !TABLES.includes(table) ||
      !schemas[table as Table] ||
      table === "users" ||
      table === "settings"
    )
      throw Error("Registro inválido");
    if (typeof id !== "string" || !id || id.length > 100)
      throw Error("Registro inválido");
    // Derived rows go in the same batch, so nothing is left half-deleted.
    const statements = [
      db()
        .prepare(`DELETE FROM ${table} WHERE user_id=? AND id=?`)
        .bind(user, id),
    ];
    if (table === "meals")
      statements.push(
        db()
          .prepare(
            "DELETE FROM meal_items WHERE user_id=? AND json_extract(payload,'$.mealId')=?",
          )
          .bind(user, id),
      );
    if (table === "daily_checkins")
      statements.push(
        db()
          .prepare("DELETE FROM sleep_logs WHERE user_id=? AND id=?")
          .bind(user, id.replace("daily_checkins-", "sleep-")),
      );
    await db().batch(statements);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
