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
  range,
  mean,
  macros,
  assessment,
  weightMean,
  weightTrend,
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
export function put(table: Table, user: string, data: Row) {
  return db()
    .prepare(
      `INSERT INTO ${table} (id,user_id,date,payload) VALUES (?,?,?,?) ON CONFLICT(id,user_id) DO UPDATE SET date=excluded.date,payload=excluded.payload`,
    )
    .bind(data.id, user, data.date, JSON.stringify(data));
}
export async function readData(user: string, initialize = true): Promise<Data> {
  let sets = await db().batch(
    TABLES.map((t) =>
      db()
        .prepare(`SELECT payload FROM ${t} WHERE user_id=? ORDER BY date DESC`)
        .bind(user),
    ),
  );
  let data = Object.fromEntries(
    TABLES.map((t, i) => [
      t,
      sets[i].results.map((r: any) => JSON.parse(r.payload)),
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
export function report(data: Data, end: string) {
  const start = shift(end, -6),
    meals = range(data.meals, start, end),
    check = range(data.daily_checkins, start, end);
  const loggedDays = [...new Set(meals.map((x) => x.date))];
  const totals = loggedDays.map((d) =>
    macros(meals.filter((x) => x.date === d)),
  );
  return {
    id: "week-" + end,
    date: end,
    start,
    weight: weightMean(data.weight_logs, end),
    previousWeight: weightMean(data.weight_logs, shift(end, -7)),
    waist: range(data.body_measurements, start, end).at(0)?.waist ?? null,
    bf: range(data.body_metrics, start, end).at(0)?.bf ?? null,
    lean: (() => {
      const bf = range(data.body_metrics, start, end).at(0);
      const w = data.weight_logs.find((x) => x.date === bf?.date);
      return bf && w ? w.weight * (1 - bf.bf / 100) : null;
    })(),
    bjjPerformance: mean(
      range(data.jiujitsu_sessions, start, end).map((x) => x.performance),
    ),
    cardioScore: mean(
      range(data.jiujitsu_sessions, start, end).map((x) => x.cardio),
    ),
    strengthScore: mean(
      range(data.jiujitsu_sessions, start, end).map((x) => x.strength),
    ),
    calories: mean(totals.map((x) => x.calories)),
    protein: mean(totals.map((x) => x.protein)),
    carbs: mean(totals.map((x) => x.carbs)),
    fat: mean(totals.map((x) => x.fat)),
    mealDays: loggedDays.length,
    sleep: mean(check.map((x) => x.hours)),
    hunger: mean(check.map((x) => x.hunger)),
    energy: mean(check.map((x) => x.energy)),
    stress: mean(check.map((x) => x.stress)),
    bjj: range(data.jiujitsu_sessions, start, end).length,
    gym: range(data.gym_sessions, start, end).length,
    cardio: range(data.cardio_sessions, start, end).length,
    conclusion: assessment(
      Object.fromEntries(
        TABLES.map((t) => [t, data[t].filter((x) => x.date <= end)]),
      ) as Data,
      end,
    ),
    consistency: Math.round(
      (100 *
        (Math.min(7, range(data.weight_logs, start, end).length) +
          loggedDays.length +
          Math.min(7, check.length))) /
        (7 * 3),
    ),
  } as Row;
}
export async function weekly(user: string, data: Data) {
  const d = today(),
    dow = new Date(d + "T12:00:00Z").getUTCDay(),
    end = shift(d, -dow);
  if (data.users[0]?.date <= end) {
    const r = report(data, end);
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
