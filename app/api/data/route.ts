import { db, owner, guard, put, readData, weekly, failure } from "@/lib/server";
import {
  schemas,
  Table,
  TABLES,
  Row,
  macros,
  foodMacros,
  today,
  navyBF,
} from "@/lib/body";
export async function GET(req: Request) {
  try {
    return Response.json(await weekly(owner(req), await readData(owner(req))), {
      headers: {
        "Cache-Control": "no-store",
        "X-BodyOS-Owner": encodeURIComponent(owner(req)),
      },
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
    data.id =
      table === "settings"
        ? "profile-settings"
        : ["weight_logs", "daily_checkins", "nutrition_targets"].includes(table)
          ? `${table}-${data.date}`
          : (data.id ?? crypto.randomUUID());
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
      const all = await readData(user);
      data.items = data.items.map((item: any) => {
        const f = all.foods.find((x) => x.id === item.foodId);
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
      const bf = navyBF(177, data.abdomen, data.neck);
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
      { table, id } = (await req.json()) as any;
    if (!TABLES.includes(table) || !schemas[table as Table])
      throw Error("Registro inválido");
    await db()
      .prepare(`DELETE FROM ${table} WHERE user_id=? AND id=?`)
      .bind(user, id)
      .run();
    if (table === "meals")
      await db()
        .prepare(
          "DELETE FROM meal_items WHERE user_id=? AND json_extract(payload,'$.mealId')=?",
        )
        .bind(user, id)
        .run();
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
