import { env } from "cloudflare:workers";
import {
  Data,
  FOOD_SEED,
  PHASES,
  Row,
  Table,
  TABLES,
  today,
  shift,
  report,
} from "./body";
export function db() {
  if (!env.DB) throw Error("Banco indisponível");
  return env.DB;
}
export function owner(request: Request) {
  const id = request.headers.get("oai-authenticated-user-id");
  if (id) return id;
  if (
    import.meta.env.DEV &&
    ["localhost", "127.0.0.1"].includes(new URL(request.url).hostname)
  )
    return "local-athlete";
  throw Error("UNAUTHORIZED");
}
export function guard(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw Error("Origem inválida");
}
// Tables added after the first migration are created on demand. CREATE ... IF
// NOT EXISTS is idempotent and never touches existing rows, so an older local
// database keeps working without a manual migration step.
let schemaReady: Promise<unknown> | null = null;
export function ensureSchema() {
  schemaReady ??= db()
    .batch([
      db().prepare(
        "CREATE TABLE IF NOT EXISTS nutrition_days (id text NOT NULL, user_id text NOT NULL, date text NOT NULL, payload text NOT NULL, PRIMARY KEY(id, user_id))",
      ),
      db().prepare(
        "CREATE INDEX IF NOT EXISTS idx_nutrition_days_user_date ON nutrition_days (user_id, date)",
      ),
    ])
    .catch((e) => {
      schemaReady = null;
      throw e;
    });
  return schemaReady;
}
// Reads only the tables a request needs, instead of the whole account.
export async function readTables<T extends Table>(user: string, tables: T[]) {
  await ensureSchema();
  const sets = await db().batch<{ payload: string }>(
    tables.map((t) =>
      db()
        .prepare(`SELECT payload FROM ${t} WHERE user_id=? ORDER BY date DESC`)
        .bind(user),
    ),
  );
  return Object.fromEntries(
    tables.map((t, i) => [t, sets[i].results.map((r) => JSON.parse(r.payload))]),
  ) as Pick<Data, T>;
}
export function put(table: Table, user: string, data: Row) {
  return db()
    .prepare(
      `INSERT INTO ${table} (id,user_id,date,payload) VALUES (?,?,?,?) ON CONFLICT(id,user_id) DO UPDATE SET date=excluded.date,payload=excluded.payload`,
    )
    .bind(data.id, user, data.date, JSON.stringify(data));
}
export async function readData(user: string, initialize = true): Promise<Data> {
  await ensureSchema();
  const sets = await db().batch<{ payload: string }>(
    TABLES.map((t) =>
      db()
        .prepare(`SELECT payload FROM ${t} WHERE user_id=? ORDER BY date DESC`)
        .bind(user),
    ),
  );
  const data = Object.fromEntries(
    TABLES.map((t, i) => [
      t,
      sets[i].results.map((r) => JSON.parse(r.payload)),
    ]),
  ) as Data;
  if (initialize && !data.users.length) {
    const d = today();
    const initial: Partial<Record<Table, Row[]>> = {
      users: [
        {
          id: "profile",
          date: d,
          sex: "male",
          age: 18,
          height: 177,
          lactoseIntolerant: true,
          bjjDays: [1, 3, 5],
          bjjTime: "15:00",
          gymTime: "06:00",
        },
      ],
      weight_logs: [
        {
          id: "weight_logs-" + d,
          date: d,
          weight: 85,
          source: "Referência inicial aproximada informada",
        },
      ],
      settings: [
        {
          id: "profile-settings",
          date: d,
          name: "BODY OS",
          phase: PHASES[0],
          steps: 8000,
          water: 2500,
          bfGoal: null,
          theme: "dark",
        },
      ],
      goals: [
        {
          id: "main",
          date: d,
          title: "Reduzir gordura corporal preservando massa muscular.",
          type: "principal",
          active: true,
        },
        {
          id: "sport",
          date: d,
          title: "Melhorar performance no Jiu-Jitsu.",
          type: "esportivo",
          active: true,
        },
        {
          id: "november",
          date: d,
          title:
            "Referência intermediária: aproximadamente 80 kg em novembro. Data a confirmar.",
          type: "temporário",
          active: true,
        },
      ],
      foods: FOOD_SEED,
    };
    const commands = [];
    for (const [table, rows] of Object.entries(initial))
      for (const row of rows!)
        commands.push(
          db()
            .prepare(
              `INSERT OR IGNORE INTO ${table} (id,user_id,date,payload) VALUES (?,?,?,?)`,
            )
            .bind(row.id, user, row.date, JSON.stringify(row)),
        );
    await db().batch(commands);
    return readData(user, false);
  }
  // Catalog growth reaches existing accounts: only seed ids the account has
  // never had are inserted, so foods the athlete edited keep their values.
  if (initialize) {
    const have = new Set(data.foods.map((f) => f.id));
    const missing = FOOD_SEED.filter((f) => !have.has(f.id));
    if (missing.length) {
      await db().batch(
        missing.map((f) =>
          db()
            .prepare(
              "INSERT OR IGNORE INTO foods (id,user_id,date,payload) VALUES (?,?,?,?)",
            )
            .bind(f.id, user, f.date, JSON.stringify(f)),
        ),
      );
      data.foods.push(...missing);
    }
  }
  const expired = data.competition_events.filter(
    (e) => !e.archived && e.eventDate < today(),
  );
  if (expired.length) {
    for (const e of expired) {
      e.archived = true;
      await put("competition_events", user, e).run();
    }
    for (const g of data.goals.filter(
      (g) => g.type === "temporário" && g.active,
    )) {
      g.active = false;
      await put("goals", user, g).run();
    }
  }
  return data;
}
export async function weekly(user: string, data: Data) {
  const d = today(),
    dow = new Date(d + "T12:00:00Z").getUTCDay(),
    end = shift(d, -dow);
  if (data.users[0]?.date <= end) {
    const r = report(data, end);
    // Every sync reads this route; write only when the summary actually changed.
    const stored = data.weekly_reports.find((x) => x.id === r.id);
    if (!stored || JSON.stringify(stored) !== JSON.stringify(r))
      await put("weekly_reports", user, r).run();
    data.weekly_reports = [
      r,
      ...data.weekly_reports.filter((x) => x.id !== r.id),
    ];
  }
  return data;
}
export function failure(e: unknown) {
  console.error(e);
  const msg = e instanceof Error ? e.message : "Erro inesperado";
  return Response.json(
    {
      error:
        msg === "UNAUTHORIZED"
          ? "Entre na sua conta para acessar seus dados."
          : msg,
    },
    { status: msg === "UNAUTHORIZED" ? 401 : 400 },
  );
}
