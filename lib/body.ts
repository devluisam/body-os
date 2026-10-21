import { z } from "zod";
export const TABLES = [
  "users",
  "goals",
  "body_metrics",
  "weight_logs",
  "body_measurements",
  "progress_photos",
  "foods",
  "meals",
  "meal_items",
  "nutrition_targets",
  "jiujitsu_sessions",
  "gym_sessions",
  "gym_exercises",
  "cardio_sessions",
  "daily_checkins",
  "sleep_logs",
  "water_logs",
  "competition_events",
  "competition_categories",
  "weekly_reports",
  "ai_conversations",
  "settings",
  // One row per day the athlete closed as complete; absence means "not confirmed".
  "nutrition_days",
] as const;
export type Table = (typeof TABLES)[number];
// Flexible payloads are validated by table-specific schemas before persistence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows are schema-checked JSON
export type Row = { id: string; date: string; [key: string]: any };
export type Data = Record<Table, Row[]>;
// A meal line as the form sends it; the server fills in name and macros.
export type MealItemInput = { foodId: string; grams: number; foodSnapshot?: Row };
export type Draft = Partial<Row>;
export const PHASES = [
  "Redução de gordura",
  "Manutenção",
  "Ganho controlado",
  "Preparação para competição",
  "Pós-competição",
  "Recomposição corporal",
];
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function shift(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function days(a: string, b: string) {
  return Math.round(
    (Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 86400000,
  );
}
// Missing answers (undefined/null) are skipped, never averaged in as zero.
export const mean = (values: (number | null | undefined)[]) => {
  const v = values.filter(
    (x): x is number => typeof x === "number" && Number.isFinite(x),
  );
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
// Accepts the comma the pt-BR keyboard types ("85,4") as well as a dot.
export function parseDecimal(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  if (!text || !/^-?\d*\.?\d+$/.test(text)) return null;
  return Number(text);
}
export const fmt = (v: number | null | undefined, d = 1) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      });
export function range(rows: Row[], start: string, end = today()) {
  return rows.filter((r) => r.date >= start && r.date <= end);
}
export function latest(rows: Row[]) {
  return [...rows]
    .filter((r) => r.date <= today())
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")) ||
        b.id.localeCompare(a.id),
    )[0];
}
// The athlete's profile lives in `users`; screens read it here instead of assuming values.
export function profile(data: Partial<Data>) {
  const u = latest(data.users ?? []);
  const list = (v: unknown) => (Array.isArray(v) ? (v as number[]) : []);
  return {
    height: typeof u?.height === "number" ? (u.height as number) : null,
    age: typeof u?.age === "number" ? (u.age as number) : null,
    sex: (u?.sex as string | undefined) ?? null,
    bjjDays: list(u?.bjjDays),
    bjjTime: (u?.bjjTime as string | undefined) || null,
    gymDays: list(u?.gymDays),
    gymTime: (u?.gymTime as string | undefined) || null,
    // One more regular activity (basketball, for example), named by the athlete.
    sportName: (u?.sportName as string | undefined)?.trim() || null,
    sportDays: list(u?.sportDays),
    sportTime: (u?.sportTime as string | undefined) || null,
  };
}
const weekday = (date: string) => new Date(date + "T12:00:00Z").getUTCDay();
export function trainsToday(data: Partial<Data>, date = today()) {
  return profile(data).bjjDays.includes(weekday(date));
}
export type Planned = { name: string; time: string | null };
// What the routine in the profile plans for a day, earliest first; sessions
// without a time come last.
export function plannedOn(data: Partial<Data>, date = today()): Planned[] {
  const me = profile(data),
    d = weekday(date),
    out: Planned[] = [];
  if (me.gymDays.includes(d)) out.push({ name: "Musculação", time: me.gymTime });
  if (me.bjjDays.includes(d)) out.push({ name: "Jiu-Jitsu", time: me.bjjTime });
  if (me.sportName && me.sportDays.includes(d))
    out.push({ name: me.sportName, time: me.sportTime });
  return out.sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
}
// "15:00" → "15h", "15:30" → "15h30".
export function hour(time: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":");
  return `${Number(h)}h${m && m !== "00" ? m : ""}`;
}
export function weightMean(rows: Row[], end = today()) {
  return mean(range(rows, shift(end, -6), end).map((r) => r.weight));
}
export function weightTrend(rows: Row[], end = today()) {
  const a = range(rows, shift(end, -6), end),
    b = range(rows, shift(end, -13), shift(end, -7));
  return a.length >= 3 && b.length >= 3
    ? mean(a.map((x) => x.weight))! - mean(b.map((x) => x.weight))!
    : null;
}
export function navyBF(height: number, abdomen: number, neck: number) {
  if (height <= 0 || abdomen <= neck || neck <= 0) return null;
  const v =
    86.01 * Math.log10((abdomen - neck) / 2.54) -
    70.041 * Math.log10(height / 2.54) +
    36.76;
  return v >= 3 && v <= 60 ? v : null;
}
export function readiness(c?: Row, load = 0) {
  if (!c) return null;
  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        Math.min(c.hours / 8, 1) * 25 +
          c.quality * 2 +
          c.energy * 2 +
          (10 - c.fatigue) * 1.5 +
          (10 - c.soreness) +
          (10 - c.stress) -
          Math.min(load / 150, 10),
      ),
    ),
  );
}
export function macros(items: Row[]) {
  return items.reduce(
    (a, r) => ({
      calories: a.calories + (r.calories || 0),
      protein: a.protein + (r.protein || 0),
      carbs: a.carbs + (r.carbs || 0),
      fat: a.fat + (r.fat || 0),
      fiber: a.fiber + (r.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}
type FoodValues = {
  portion?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};
export function foodMacros(f: Row | FoodValues, g: number) {
  const k = g / (f.portion || 100);
  return {
    calories: f.calories * k,
    protein: f.protein * k,
    carbs: f.carbs * k,
    fat: f.fat * k,
    fiber: f.fiber * k,
  };
}
// Stand-ins used only until the profile and a first weigh-in exist, so the
// screens can show a starting point. They describe nobody in particular.
export const FALLBACK = { weight: 75, height: 175, age: 30 } as const;
export function targets(data: Data) {
  const saved = latest(data.nutrition_targets);
  const w = latest(data.weight_logs)?.weight ?? FALLBACK.weight,
    phase = latest(data.settings)?.phase ?? PHASES[0];
  const protein = Math.round(
    w * ([PHASES[0], PHASES[3]].includes(phase) ? 2 : 1.8),
  );
  // Without a sex in the profile, the midpoint of the two Mifflin–St Jeor constants.
  const me = profile(data),
    bmr =
      10 * w +
      6.25 * (me.height ?? FALLBACK.height) -
      5 * (me.age ?? FALLBACK.age) +
      (me.sex === "female" ? -161 : me.sex === "male" ? 5 : -78);
  const calories =
    Math.round(
      (bmr * 1.55 +
        (phase === PHASES[0] ? -300 : phase === PHASES[2] ? 150 : 0)) /
        50,
    ) * 50;
  return (
    saved ?? {
      calories,
      protein,
      carbs: Math.round((calories - protein * 4 - 70 * 9) / 4),
      fat: 70,
      fiber: 30,
    }
  );
}
export function composition(data: Data) {
  const w = latest(data.weight_logs),
    bf = latest(data.body_metrics),
    matched = bf ? data.weight_logs.find((x) => x.date === bf.date) : undefined;
  return {
    weight: w?.weight ?? FALLBACK.weight,
    bf: bf?.bf ?? null,
    method: bf?.method,
    bfDate: bf?.date,
    lean: matched && bf ? matched.weight * (1 - bf.bf / 100) : null,
    fat: matched && bf ? (matched.weight * bf.bf) / 100 : null,
    waist: latest(data.body_measurements)?.waist ?? null,
  };
}
export function assessment(data: Data, asOf = today()) {
  const trend = weightTrend(data.weight_logs, asOf),
    checks = range(data.daily_checkins, shift(asOf, -6), asOf),
    energy = mean(checks.map((x) => x.energy));
  const lifts = [...data.gym_exercises].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  let strengthDrop = false;
  for (const x of lifts) {
    const before = lifts
      .filter(
        (y) =>
          y.exercise.toLowerCase() === x.exercise.toLowerCase() &&
          y.date < x.date,
      )
      .at(-1);
    if (
      before &&
      x.load * (1 + x.reps / 30) < before.load * (1 + before.reps / 30) * 0.95
    )
      strengthDrop = true;
  }
  const p = mean(
      range(data.jiujitsu_sessions, shift(asOf, -6), asOf).map(
        (x) => x.performance,
      ),
    ),
    op = mean(
      range(data.jiujitsu_sessions, shift(asOf, -20), shift(asOf, -7)).map(
        (x) => x.performance,
      ),
    );
  const mealDays = [
    ...new Set(range(data.meals, shift(asOf, -6), asOf).map((x) => x.date)),
  ];
  const protein = mean(
    mealDays.map((d) => macros(data.meals.filter((x) => x.date === d)).protein),
  );
  if (
    trend != null &&
    trend < -0.0075 * composition(data).weight &&
    strengthDrop &&
    protein != null &&
    protein < 1.6 * composition(data).weight &&
    energy != null &&
    energy < 5 &&
    p != null &&
    op != null &&
    p < op
  )
    return "Existe risco de perda de massa muscular ou recuperação inadequada. Revise calorias, proteína, sono, cardio e volume de treino com um profissional.";
  const m = [...data.body_measurements].sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    first = m.at(-2),
    last = m.at(-1);
  if (
    first &&
    last &&
    last.waist < first.waist &&
    trend != null &&
    trend < 0 &&
    !strengthDrop &&
    lifts.length >= 2 &&
    p != null &&
    op != null &&
    p >= op
  )
    return "Peso e cintura diminuíram, com força e performance estáveis. Há sinais favoráveis à redução de gordura; medidas indiretas não comprovam preservação muscular.";
  return "Construindo sua linha de base. Compare cintura, fotos e desempenho junto à tendência de peso. Massa magra estimada também inclui água e outros tecidos.";
}
export function calorieReview(data: Data) {
  const t = weightTrend(data.weight_logs),
    w = composition(data).weight,
    c = range(data.daily_checkins, shift(today(), -6));
  if (t === null || c.length < 3)
    return "Reúna pelo menos 14 dias de peso, alimentação e recuperação antes de ajustar. Nenhuma alteração automática.";
  if (
    t < -0.0075 * w ||
    (mean(c.map((x) => x.hunger)) ?? 0) > 7 ||
    (mean(c.map((x) => x.energy)) ?? 10) < 4
  )
    return "Considere aumentar 100–150 kcal e revisar a recuperação. Nenhuma alteração foi aplicada.";
  if (t > -0.001 * w)
    return "Peso estável: confira cintura, alimentação e atividade antes de considerar um ajuste de 100 kcal.";
  return "Tendência gradual. Mantenha as metas enquanto força, energia e cintura evoluem de forma favorável.";
}
const n = (min = 0, max = 10000) =>
    z.coerce.number().finite().min(min).max(max),
  score = n(0, 10),
  text = z.string().max(3000),
  optional = n().optional(),
  // Not measured stays undefined; it is never stored as 0.
  maybe = (min: number, max: number) => n(min, max).optional(),
  clockTime = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .or(z.literal("").transform(() => undefined));
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) &&
      new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s,
    "Data inválida",
  );
const base = z.object({ id: z.string().max(100).optional(), date });
export const schemas: Partial<Record<Table, z.ZodTypeAny>> = {
  weight_logs: base.extend({ weight: n(30, 250) }),
  body_measurements: base.extend({
    waist: n(30, 200),
    abdomen: n(30, 200),
    neck: n(15, 80),
    chest: optional,
    armRight: optional,
    armLeft: optional,
    thighRight: optional,
    thighLeft: optional,
    hip: optional,
  }),
  body_metrics: base.extend({
    bf: n(3, 60),
    method: z.enum([
      "Circunferências (US Navy)",
      "Bioimpedância",
      "Avaliação profissional",
      "Avaliação visual manual",
    ]),
  }),
  foods: base.extend({
    name: z.string().min(1).max(100),
    portion: n(1, 1000),
    calories: n(0, 10000),
    protein: n(0, 1000),
    carbs: n(0, 1000),
    fat: n(0, 1000),
    fiber: n(0, 1000),
    sodium: n(0, 100000),
    source: text.optional(),
  }),
  meals: base.extend({
    name: text,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    items: z
      .array(z.object({ foodId: z.string(), grams: n(1, 2000) }))
      .min(1)
      .max(30),
  }),
  nutrition_targets: base.extend({
    calories: n(1800, 5000),
    protein: n(80, 250),
    carbs: n(100, 800),
    fat: n(40, 180),
    fiber: n(15, 60),
  }),
  daily_checkins: base.extend({
    hours: n(0, 14),
    quality: score,
    hunger: score,
    energy: score,
    stress: score,
    soreness: score,
    motivation: maybe(0, 10),
    fatigue: score,
    performance: maybe(0, 10),
    steps: maybe(0, 80000),
    bedtime: clockTime,
    waketime: clockTime,
  }),
  water_logs: base.extend({ ml: n(50, 2000) }),
  jiujitsu_sessions: base.extend({
    duration: n(1, 300),
    rounds: n(0, 50),
    roundMinutes: n(1, 20),
    rpe: n(1, 10),
    cardio: maybe(0, 10),
    strength: maybe(0, 10),
    technique: maybe(0, 10),
    energy: maybe(0, 10),
    recovery: maybe(0, 10),
    performance: score,
    fatigueAt: maybe(1, 300),
    hr: maybe(30, 240),
    techniques: text.optional(),
  }),
  gym_sessions: base.extend({ duration: n(1, 240), notes: text.optional() }),
  gym_exercises: base.extend({
    exercise: z.string().min(1).max(150),
    load: n(0, 500),
    reps: n(1, 100),
    sets: n(1, 30),
    rir: n(0, 10),
    // RIR already describes effort; RPE is an optional second reading.
    rpe: maybe(1, 10),
  }),
  cardio_sessions: base.extend({
    mode: z.enum(["Corrida", "Caminhada", "Esteira", "Bike", "Basquete", "Outro esporte"]),
    type: z.enum(["Zona 2", "Intervalado", "Livre"]),
    duration: n(1, 300),
    hr: maybe(30, 240),
    distance: maybe(0.01, 100),
    speed: maybe(0.1, 50),
    incline: maybe(0, 30),
    rpe: n(1, 10),
  }),
  competition_events: base.extend({
    name: z.string().min(1).max(150),
    eventDate: date,
    category: text,
    limit: n(30, 200),
    withGi: z.boolean(),
    gi: n(0, 5),
    weighDate: date,
    weighTime: z.string(),
    fightGap: n(0, 1440),
    reference: n(30, 200),
    archived: z.boolean().default(false),
  }),
  competition_categories: base.extend({
    name: text,
    limit: n(30, 200),
    withGi: z.boolean(),
  }),
  settings: base.extend({
    name: z.string().min(1).max(40),
    phase: z.enum(PHASES as [string, ...string[]]),
    steps: n(1000, 30000),
    water: n(500, 6000),
    bfGoal: n(8, 40).nullable(),
    // Target body weight without gi; optional, never set by the app.
    weightGoal: n(30, 250).nullable().optional(),
    theme: z.enum(["dark", "light"]),
  }),
  users: base.extend({
    sex: z.enum(["male", "female"]),
    age: n(14, 90),
    height: n(120, 230),
    lactoseIntolerant: z.boolean(),
    bjjDays: z.array(z.number().int().min(0).max(6)).max(7),
    bjjTime: clockTime,
    gymDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    gymTime: clockTime,
    sportName: z.string().max(40).optional(),
    sportDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    sportTime: clockTime,
  }),
  nutrition_days: base.extend({
    complete: z.boolean(),
    note: z.string().max(300).optional(),
  }),
  goals: base.extend({
    title: z.string().min(1).max(300),
    type: z.enum(["principal", "esportivo", "temporário"]),
    active: z.boolean(),
  }),
};
const FOOD_SOURCES = {
  TACO: "TACO 4ª ed. (Unicamp)",
  USDA: "USDA FoodData Central",
};
export const FOOD_SEED = [
  ["Frango grelhado", 159, 32, 0, 2.5, 0],
  ["Frango desfiado", 159, 32, 0, 2.5, 0],
  ["Frango frito", 280, 25, 8, 16, 0],
  ["Peixe grelhado", 130, 26, 0, 2.5, 0],
  ["Carne bovina grelhada", 220, 30, 0, 11, 0],
  ["Ovos cozidos", 146, 13, 1, 9.5, 0],
  ["Arroz cozido", 128, 2.5, 28, 0.2, 1.6],
  ["Feijão cozido", 76, 4.8, 13.6, 0.5, 8.5],
  ["Macarrão cozido", 157, 5.8, 30.9, 0.9, 1.8],
  ["Batata cozida", 52, 1.2, 11.9, 0, 1.3],
  ["Batata-doce cozida", 77, 0.6, 18.4, 0.1, 2.2],
  ["Tapioca pronta", 240, 0.2, 60, 0, 0.2],
  ["Pão francês", 300, 8, 58, 3.1, 2.3],
  ["Aveia", 394, 13.9, 66.6, 8.5, 9.1],
  ["Banana", 98, 1.3, 26, 0.1, 2],
  ["Maçã", 56, 0.3, 15.2, 0, 1.3],
  ["Mamão", 45, 0.8, 11.6, 0.1, 1.8],
  ["Salada sem molho", 20, 1, 3, 0.2, 2],
  ["Vinagrete", 35, 1, 6, 1, 1.5],
  ["Azeite", 884, 0, 0, 100, 0],
  ["Manteiga", 726, 0.4, 0.1, 82, 0],
  ["Suco de laranja", 45, 0.7, 10.4, 0.2, 0.2],
  ["Leite sem lactose", 61, 3.2, 4.7, 3.3, 0],
  ["Queijo sem lactose", 300, 22, 3, 23, 0],
  ["Iogurte sem lactose", 65, 4, 6, 3, 0],
  ["Whey sem lactose", 380, 80, 8, 4, 0],
  // Added 2026-09-26. Ids continue the sequence, so existing accounts receive
  // only these rows (see readData) and edited foods keep their values.
  ["Arroz integral cozido", 124, 2.6, 25.8, 1, 2.7, "TACO"],
  ["Cuscuz de milho cozido", 113, 2.2, 25.3, 0.7, 2.1, "TACO"],
  ["Mandioca cozida", 125, 0.6, 30.1, 0.3, 1.6, "TACO"],
  ["Lentilha cozida", 93, 6.3, 16.3, 0.5, 7.9, "TACO"],
  ["Grão-de-bico cozido", 164, 8.9, 27.4, 2.6, 7.6, "USDA"],
  ["Pão de forma integral", 253, 9.4, 49.9, 3.7, 6.9, "TACO"],
  ["Farofa pronta", 406, 2.1, 80.3, 9.1, 7.8, "TACO"],
  ["Batata frita", 267, 5, 35.6, 13.1, 8.1, "TACO"],
  ["Patinho grelhado", 219, 35.9, 0, 7.3, 0, "TACO"],
  ["Carne moída cozida", 212, 26.7, 0, 10.9, 0, "TACO"],
  ["Lombo de porco assado", 210, 35.7, 0, 6.4, 0, "TACO"],
  ["Tilápia grelhada", 128, 26.2, 0, 2.7, 0, "USDA"],
  ["Salmão grelhado", 206, 22.1, 0, 12.4, 0, "USDA"],
  ["Atum em lata em água", 116, 25.5, 0, 0.8, 0, "USDA"],
  ["Sardinha em lata em óleo", 285, 15.9, 0, 24, 0, "TACO"],
  ["Ovos fritos", 240, 15.6, 1.2, 18.6, 0, "TACO"],
  ["Brócolis cozido", 25, 2.1, 4.4, 0.5, 3.4, "TACO"],
  ["Cenoura cozida", 30, 0.8, 6.7, 0.2, 2.6, "TACO"],
  ["Abóbora cabotiá cozida", 48, 1.4, 10.8, 0.7, 2.5, "TACO"],
  ["Tomate", 15, 1.1, 3.1, 0.2, 1.2, "TACO"],
  ["Laranja", 37, 1, 8.9, 0.1, 0.8, "TACO"],
  ["Morango", 30, 0.9, 6.8, 0.3, 1.7, "TACO"],
  ["Abacaxi", 48, 0.9, 12.3, 0.1, 1, "TACO"],
  ["Melancia", 33, 0.9, 8.1, 0, 0.1, "TACO"],
  ["Manga", 72, 0.4, 19.4, 0.2, 1.6, "TACO"],
  ["Uva", 53, 0.7, 13.6, 0.2, 0.9, "TACO"],
  ["Abacate", 96, 1.2, 6, 8.4, 6.3, "TACO"],
  ["Açaí polpa sem açúcar", 58, 0.8, 6.2, 3.9, 2.6, "TACO"],
  ["Mel", 309, 0, 84, 0, 0, "TACO"],
  ["Pasta de amendoim", 588, 25.1, 20, 50.4, 6, "USDA"],
  ["Castanha-do-pará", 643, 14.5, 15.1, 63.5, 7.9, "TACO"],
  ["Castanha de caju torrada", 570, 18.5, 29.1, 46.3, 3.7, "TACO"],
  ["Café sem açúcar", 9, 0.7, 1.5, 0.1, 0, "TACO"],
].map(
  (r, i) =>
    ({
      id: "food-" + i,
      date: "2026-09-17",
      name: r[0],
      portion: 100,
      calories: r[1],
      protein: r[2],
      carbs: r[3],
      fat: r[4],
      fiber: r[5],
      sodium: 0,
      source: r[6]
        ? `${FOOD_SOURCES[r[6] as keyof typeof FOOD_SOURCES]}, por 100 g/ml; valor aproximado, confirme o preparo e o rótulo. Sódio não informado.`
        : "Valor inicial aproximado por 100 g/ml; confirme o preparo e rótulo. Sódio não informado.",
    }) as Row,
);
export const MEAL_SLOTS = [
  {
    name: "Café da manhã",
    time: "07:00",
    share: 0.22,
    prefer: /ovo|aveia|tapioca|cuscuz|pao|\bmaca\b|banana|mamao|iogurte|leite|queijo|whey|manteiga|suco|cafe/,
    note: "Comece com proteína. O carboidrato acompanha o que você vai fazer de manhã.",
  },
  {
    name: "Lanche da manhã",
    time: "10:00",
    share: 0.1,
    prefer: /banana|\bmaca\b|mamao|laranja|morango|iogurte|whey|queijo|aveia|ovo|castanha/,
    note: "Lanche pequeno: uma fruta e uma fonte de proteína resolvem.",
  },
  {
    name: "Almoço",
    time: "12:30",
    share: 0.3,
    prefer: /arroz|feijao|lentilha|grao|frango|carne|patinho|peixe|tilapia|salmao|atum|macarrao|batata|mandioca|salada|brocolis|cenoura|abobora|tomate|vinagrete|azeite/,
    note: "Prato principal do dia: proteína, carboidrato e salada.",
  },
  {
    name: "Lanche da tarde",
    time: "16:00",
    share: 0.1,
    prefer: /banana|\bmaca\b|mamao|manga|abacaxi|iogurte|whey|tapioca|cuscuz|pao|aveia|pasta de amendoim/,
    note: "Antes do treino, carboidrato de digestão fácil costuma cair melhor.",
  },
  {
    name: "Jantar",
    time: "20:00",
    share: 0.23,
    prefer: /frango|peixe|tilapia|salmao|atum|carne|patinho|ovo|salada|brocolis|cenoura|abobora|vinagrete|arroz|batata|mandioca|cuscuz|legume/,
    note: "Proteína e vegetais. Ajuste o carboidrato ao treino do dia.",
  },
  {
    name: "Ceia",
    time: "22:00",
    share: 0.05,
    prefer: /iogurte|queijo|whey|leite|ovo/,
    note: "Opcional. Só se ainda faltar proteína no dia.",
  },
] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];
const minutes = (t: string) => {
  const [h, m] = String(t || "00:00")
    .split(":")
    .map(Number);
  return (h || 0) * 60 + (m || 0);
};
export function nowTime() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}
// Meals keep the name chosen when they were logged; older or free meals fall
// back to the slot closest to their clock time, so nothing leaves the day.
export function slotAt(time = nowTime()): MealSlot {
  return MEAL_SLOTS.reduce((best, s) =>
    Math.abs(minutes(s.time) - minutes(time)) <
    Math.abs(minutes(best.time) - minutes(time))
      ? s
      : best,
  );
}
export function mealPlan(
  data: Data,
  date = today(),
  clock = date === today() ? nowTime() : "23:59",
) {
  const t = targets(data),
    meals = data.meals.filter((x) => x.date === date),
    grouped = new Map<string, Row[]>(MEAL_SLOTS.map((s) => [s.name, []]));
  for (const meal of meals) {
    const slot =
      MEAL_SLOTS.find((s) => s.name === meal.name) ?? slotAt(meal.time);
    grouped.get(slot.name)!.push(meal);
  }
  const slots = MEAL_SLOTS.map((s) => {
    const rows = grouped
      .get(s.name)!
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
    const logged = macros(rows),
      target = {
        calories: Math.round(t.calories * s.share),
        protein: Math.round(t.protein * s.share),
      };
    return {
      ...s,
      meals: rows,
      logged,
      target,
      done: rows.length > 0,
      remaining: Math.round(target.calories - logged.calories),
    };
  });
  const eaten = macros(meals),
    pending = slots.filter((s) => !s.done);
  return {
    date,
    slots,
    meals,
    eaten,
    goal: t,
    remaining: Math.round(t.calories - eaten.calories),
    next:
      pending.find((s) => minutes(s.time) >= minutes(clock)) ??
      pending[pending.length - 1] ??
      null,
  };
}
export function mealIdea(
  available: string,
  data: Data,
  hunger = 5,
  training = false,
  slotName?: string,
) {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  const input = norm(available).replace(/(?:nao (?:tem|tenho)|sem)\s+\S+/g, "");
  const slot = MEAL_SLOTS.find((s) => s.name === slotName);
  const matched = data.foods.filter((f) =>
    input.includes(norm(f.name).split(" ")[0]),
  );
  const ranked = [...matched].sort((a, b) => {
    const rank = (f: Row) => {
      const n = norm(f.name);
      return (
        (input.includes(n) ? 10 : 0) +
        (slot?.prefer.test(n) ? 6 : 0) +
        (/grelhado|cozido/.test(n) ? 3 : 0)
      );
    };
    return rank(b) - rank(a) || a.name.localeCompare(b.name);
  });
  const unique = ranked.filter(
    (f, i, a) =>
      a.findIndex(
        (x) => norm(x.name).split(" ")[0] === norm(f.name).split(" ")[0],
      ) === i,
  );
  const t = targets(data),
    eaten = macros(data.meals.filter((x) => x.date === today())),
    remaining = t.calories - eaten.calories;
  const carbPortion = training
    ? 150
    : hunger >= 7
      ? 140
      : remaining > 0 && remaining < 500
        ? 90
        : 120;
  const sized = unique.map((f) => ({
    f,
    grams: /whey/i.test(f.name)
      ? 30
      : /queijo/i.test(f.name)
        ? 40
        : f.fat >= 80
          ? 5
          : f.fat >= 40
            ? 15
            : f.protein >= 20
              ? 160
              : f.name.includes("Feijão")
                ? 80
                : f.calories > 300 && f.carbs > 50
                  ? 40
                  : f.carbs > 20
                    ? carbPortion
                    : 100,
  }));
  // With a slot chosen, the portions answer that meal's share of the day
  // instead of the whole day. Condiments and oils keep their small amount.
  const budget = slot
    ? Math.max(
        120,
        (() => {
          const s = mealPlan(data).slots.find((x) => x.name === slot.name)!;
          return s.target.calories - s.logged.calories;
        })(),
      )
    : null;
  const total = sized.reduce((a, s) => a + foodMacros(s.f, s.grams).calories, 0);
  const factor =
    budget && total ? Math.min(1.6, Math.max(0.5, budget / total)) : 1;
  return sized.map(({ f, grams: base }) => {
    const grams =
      f.fat >= 50 ? base : Math.max(10, Math.round((base * factor) / 5) * 5);
    return { ...f, name: f.name, foodId: f.id, grams, ...foodMacros(f, grams) };
  });
}
// One id per day for daily records, so saving again (or replaying offline)
// updates the day instead of duplicating it.
const DAILY: Table[] = [
  "weight_logs",
  "daily_checkins",
  "nutrition_targets",
  "nutrition_days",
];
export function canonicalId(table: Table, data: Partial<Row>) {
  return table === "settings"
    ? "profile-settings"
    : table === "users"
      ? "profile"
      : DAILY.includes(table)
        ? `${table}-${data.date}`
        : data.id || crypto.randomUUID();
}
// "hoje", "ontem", "há 5 dias": how old a reading is matters as much as its value.
export function ago(date: string, from = today()) {
  const n = days(from, date);
  return n <= 0 ? "hoje" : n === 1 ? "ontem" : `há ${n} dias`;
}
// What the scale data supports right now, with the basis spelled out.
export function weightStatus(rows: Row[], asOf = today()) {
  const last = latest(rows.filter((r) => r.date <= asOf));
  const week = range(rows, shift(asOf, -6), asOf),
    previous = range(rows, shift(asOf, -13), shift(asOf, -7));
  return {
    last: last ?? null,
    age: last ? days(asOf, last.date) : null,
    reference: !!last?.source,
    week: week.length,
    previous: previous.length,
    mean: week.length >= 3 ? mean(week.map((x) => x.weight)) : null,
    trend: weightTrend(rows, asOf),
  };
}
export type DayState = "vazio" | "em andamento" | "incompleto" | "completo";
// A day of food is only "completo" when the athlete says so. Until then the
// totals are a floor, not what was eaten.
export function dayStatus(data: Data, date = today()) {
  const meals = data.meals.filter((x) => x.date === date),
    mark = data.nutrition_days.find((x) => x.date === date);
  const state: DayState = mark?.complete
    ? "completo"
    : !meals.length
      ? "vazio"
      : date === today()
        ? "em andamento"
        : "incompleto";
  return { date, meals: meals.length, state, complete: state === "completo" };
}
export function report(data: Data, end: string) {
  const start = shift(end, -6),
    meals = range(data.meals, start, end),
    check = range(data.daily_checkins, start, end),
    bjj = range(data.jiujitsu_sessions, start, end);
  const loggedDays = [...new Set(meals.map((x) => x.date))].sort();
  const confirmed = loggedDays.filter((d) => dayStatus(data, d).complete);
  // Averages use the days confirmed complete when there are any; otherwise
  // they fall back to every logged day and say so (foodBasis).
  const basis = confirmed.length ? confirmed : loggedDays;
  const totals = basis.map((d) => macros(meals.filter((x) => x.date === d)));
  const metrics = [...range(data.body_metrics, start, end)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const measures = [...range(data.body_measurements, start, end)].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const bf = metrics[0],
    w = bf ? data.weight_logs.find((x) => x.date === bf.date) : undefined;
  // Same rule as the home screen: a week's mean needs 3 weigh-ins.
  const weekMean = (to: string) =>
    range(data.weight_logs, shift(to, -6), to).length >= 3
      ? weightMean(data.weight_logs, to)
      : null;
  return {
    id: "week-" + end,
    date: end,
    start,
    weight: weekMean(end),
    weighIns: range(data.weight_logs, start, end).length,
    previousWeight: weekMean(shift(end, -7)),
    waist: measures[0]?.waist ?? null,
    bf: bf?.bf ?? null,
    lean: bf && w ? w.weight * (1 - bf.bf / 100) : null,
    bjjPerformance: mean(bjj.map((x) => x.performance)),
    cardioScore: mean(bjj.map((x) => x.cardio)),
    strengthScore: mean(bjj.map((x) => x.strength)),
    calories: mean(totals.map((x) => x.calories)),
    protein: mean(totals.map((x) => x.protein)),
    carbs: mean(totals.map((x) => x.carbs)),
    fat: mean(totals.map((x) => x.fat)),
    mealDays: loggedDays.length,
    completeDays: confirmed.length,
    foodBasis: confirmed.length ? "completos" : "registrados",
    checkins: check.length,
    sleep: mean(check.map((x) => x.hours)),
    hunger: mean(check.map((x) => x.hunger)),
    energy: mean(check.map((x) => x.energy)),
    stress: mean(check.map((x) => x.stress)),
    bjj: bjj.length,
    gym: range(data.gym_sessions, start, end).length,
    cardio: range(data.cardio_sessions, start, end).length,
    conclusion: assessment(
      Object.fromEntries(
        TABLES.map((t) => [t, (data[t] ?? []).filter((x) => x.date <= end)]),
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
