import test from "node:test";
import assert from "node:assert/strict";
import {
  TABLES,
  type Data,
  type Row,
  today,
  shift,
  mean,
  parseDecimal,
  schemas,
  canonicalId,
  weightStatus,
  dayStatus,
  report,
  ago,
  plannedOn,
} from "../lib/body.ts";
import { insights } from "../lib/decisions.ts";
import { aiContext, routineText } from "../lib/coach.ts";
test("the routine plans gym, Jiu-Jitsu and another sport by weekday", () => {
  const data = empty();
  data.users = [
    {
      id: "profile",
      date: "2026-01-01",
      bjjDays: [],
      gymDays: [1, 3, 4, 5],
      gymTime: "06:00",
      sportName: "Basquete",
      sportDays: [2, 4],
    },
  ];
  // 2026-10-22 is a Thursday: gym and basketball, gym first because it has a time.
  assert.deepEqual(plannedOn(data, "2026-10-22"), [
    { name: "Musculação", time: "06:00" },
    { name: "Basquete", time: null },
  ]);
  assert.deepEqual(plannedOn(data, "2026-10-25"), []);
  assert.equal(routineText(data), "Musculação seg/qua/qui/sex às 6h; Basquete ter/qui");
});
test("a weight goal gets a healthy-pace window and the current pace", () => {
  const data = empty();
  data.settings = [{ id: "profile-settings", date: today(), weightGoal: 75 }];
  data.weight_logs = [0, 1, 2, 7, 8, 9].map((d, i) => ({
    id: "w" + i,
    date: shift(today(), -d),
    weight: d < 7 ? 87 : 87.6,
  }));
  const goal = insights(data).filter((i) => i.area === "Meta");
  assert.equal(goal[0].kind, "estimativa");
  // 12 kg at 0.87–0.435 kg/week: 14 to 28 weeks.
  assert.match(goal[0].text, /Faltam 12,0 kg para 75,0 kg/);
  assert.match(goal[0].text, /de 14 a 28 semanas/);
  assert.equal(goal[1].kind, "estimativa");
  assert.match(goal[1].text, /0,6 kg por semana\), cerca de 20 semanas/);
  // Losing faster than 1% a week turns into a suggestion to slow down.
  data.weight_logs = data.weight_logs.map((w) => ({ ...w, weight: w.date >= shift(today(), -6) ? 85 : 87 }));
  assert.equal(insights(data).filter((i) => i.area === "Meta")[1].kind, "sugestão");
  // No goal, no goal reading.
  data.settings = [{ id: "profile-settings", date: today() }];
  assert.equal(insights(data).filter((i) => i.area === "Meta").length, 0);
});
const empty = () => Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Data;
const profileRow: Row = {
  id: "profile",
  date: shift(today(), -60),
  sex: "male",
  age: 30,
  height: 175,
  lactoseIntolerant: false,
  bjjDays: [2, 4],
  bjjTime: "19:00",
  gymTime: "07:00",
};
test("decimals typed with a pt-BR comma are read, garbage is not", () => {
  assert.equal(parseDecimal("7,5"), 7.5);
  assert.equal(parseDecimal(" 85.4 "), 85.4);
  assert.equal(parseDecimal("85,40"), 85.4);
  assert.equal(parseDecimal(""), null);
  assert.equal(parseDecimal("8,5,1"), null);
  assert.equal(parseDecimal("abc"), null);
});
test("a missing answer is skipped by the mean, never counted as zero", () => {
  assert.equal(mean([8, undefined, null, 6]), 7);
  assert.equal(mean([undefined]), null);
});
test("check-in without steps stays unmeasured; clock times are validated", () => {
  const base = { date: today(), hours: 7, quality: 7, hunger: 5, energy: 6, stress: 3, soreness: 2, fatigue: 4 };
  const ok = schemas.daily_checkins!.safeParse(base);
  assert.ok(ok.success);
  assert.equal(ok.data.steps, undefined);
  assert.ok(schemas.daily_checkins!.safeParse({ ...base, bedtime: "23:30", waketime: "" }).success);
  assert.ok(!schemas.daily_checkins!.safeParse({ ...base, bedtime: "25:00" }).success);
  // Required answers are still required.
  assert.ok(!schemas.daily_checkins!.safeParse({ ...base, energy: undefined }).success);
  // Profile times accept real hours.
  assert.ok(schemas.users!.safeParse(profileRow).success);
  // Cardio heart rate left empty is "not measured"; 0 is rejected.
  const cardio = { date: today(), mode: "Corrida", type: "Zona 2", duration: 30, rpe: 5 };
  assert.ok(schemas.cardio_sessions!.safeParse(cardio).success);
  assert.ok(!schemas.cardio_sessions!.safeParse({ ...cardio, hr: 0 }).success);
});
test("daily records share one id per day across server and offline queue", () => {
  assert.equal(canonicalId("weight_logs", { date: "2026-10-01" }), "weight_logs-2026-10-01");
  assert.equal(canonicalId("nutrition_days", { date: "2026-10-01" }), "nutrition_days-2026-10-01");
  assert.equal(canonicalId("users", { date: "2026-10-01" }), "profile");
  assert.equal(canonicalId("meals", { id: "abc", date: "2026-10-01" }), "abc");
});
test("weight status says how old the reading is and when a mean exists", () => {
  const rows: Row[] = [
    { id: "a", date: shift(today(), -25), weight: 87 },
    { id: "b", date: shift(today(), -27), weight: 85, source: "Referência" },
  ];
  const stale = weightStatus(rows);
  assert.equal(stale.age, 25);
  assert.equal(stale.mean, null);
  assert.equal(stale.week, 0);
  assert.equal(ago(shift(today(), -1)), "ontem");
  const fresh = weightStatus(
    [0, 1, 2, 7, 8, 9].map((d, i) => ({ id: "w" + i, date: shift(today(), -d), weight: d < 7 ? 84 : 85 })),
  );
  assert.equal(fresh.mean, 84);
  assert.equal(fresh.trend, -1);
});
test("a food day is complete only when the athlete closes it", () => {
  const data = empty();
  const y = shift(today(), -1);
  data.meals = [{ id: "m", date: y, name: "Almoço", time: "12:00", items: [], calories: 600, protein: 40 }];
  assert.equal(dayStatus(data, y).state, "incompleto");
  assert.equal(dayStatus(data, shift(today(), -2)).state, "vazio");
  data.nutrition_days = [{ id: "nutrition_days-" + y, date: y, complete: true }];
  assert.equal(dayStatus(data, y).state, "completo");
  data.meals.push({ id: "t", date: today(), name: "Café da manhã", time: "07:00", items: [] });
  assert.equal(dayStatus(data).state, "em andamento");
});
test("weekly food averages use complete days when there are any", () => {
  const data = empty();
  data.users = [profileRow];
  const d1 = shift(today(), -1),
    d2 = shift(today(), -2);
  data.meals = [
    { id: "a", date: d1, name: "Almoço", time: "12:00", items: [], calories: 2400, protein: 160, carbs: 0, fat: 0, fiber: 0 },
    { id: "b", date: d2, name: "Almoço", time: "12:00", items: [], calories: 600, protein: 30, carbs: 0, fat: 0, fiber: 0 },
  ];
  assert.equal(report(data, today()).calories, 1500);
  assert.equal(report(data, today()).foodBasis, "registrados");
  data.nutrition_days = [{ id: "x", date: d1, complete: true }];
  const r = report(data, today());
  assert.equal(r.calories, 2400);
  assert.equal(r.completeDays, 1);
  assert.equal(r.foodBasis, "completos");
});
test("insights say when data is insufficient instead of concluding", () => {
  const data = empty();
  data.users = [profileRow];
  data.weight_logs = [{ id: "w", date: shift(today(), -25), weight: 87 }];
  const list = insights(data);
  for (const area of ["Peso", "Alimentação", "Recuperação", "Treino"])
    assert.ok(
      list.some((i) => i.area === area && i.kind === "dados insuficientes"),
      area,
    );
  assert.ok(!list.some((i) => i.kind === "sugestão"));
  assert.ok(list.every((i) => i.basis.length > 0));
  // With enough check-ins, the reading becomes an observation with its basis.
  data.daily_checkins = [0, 1, 2].map((d) => ({
    id: "c" + d,
    date: shift(today(), -d),
    hours: 6,
    energy: 6,
    fatigue: 4,
    hunger: 5,
  }));
  const rec = insights(data).filter((i) => i.area === "Recuperação");
  assert.equal(rec[0].kind, "observação");
  assert.match(rec[0].basis, /3 check-ins/);
  assert.equal(rec[1].kind, "sugestão");
});
test("an event too far below the current weight suggests the category, not a faster cut", () => {
  const data = empty();
  data.users = [profileRow];
  data.weight_logs = [0, 1, 2, 7, 8, 9].map((d, i) => ({ id: "w" + i, date: shift(today(), -d), weight: d < 7 ? 86 : 86.2 }));
  data.competition_events = [
    { id: "e", date: today(), name: "Open", eventDate: shift(today(), 21), category: "Médio", limit: 76, withGi: true, gi: 2, archived: false },
  ];
  const event = insights(data).filter((i) => i.area === "Evento");
  assert.equal(event[0].kind, "estimativa");
  assert.equal(event[1].kind, "sugestão");
  assert.match(event[1].text, /categoria/);
});
test("the AI context is compact text from the records, without ids", () => {
  const data = empty();
  data.users = [profileRow];
  data.settings = [{ id: "profile-settings", date: today(), phase: "Redução de gordura", name: "BODY OS" }];
  data.goals = [{ id: "main", date: today(), title: "Reduzir gordura.", type: "principal", active: true }];
  data.weight_logs = Array.from({ length: 120 }, (_, i) => ({
    id: "weight_logs-" + shift(today(), -i),
    date: shift(today(), -i),
    weight: 85 - i * 0.01,
    createdAt: new Date().toISOString(),
    _mutationId: "aaaaaaaaaaaaaaaaaaaa",
  }));
  const text = aiContext(data);
  assert.match(text, /homem, 30 anos, 175 cm\./);
  assert.match(text, /Jiu-Jitsu ter\/qui às 19h/);
  assert.doesNotMatch(text, /lactose/);
  assert.match(text, /média 7 dias 8\d,\d+ kg \(7 pesagens\)/);
  assert.doesNotMatch(text, /weight_logs-|_mutationId|createdAt/);
  assert.match(text, /nenhum cadastrado; não invente/);
  // 120 days of weigh-ins still produce a short prompt.
  assert.ok(text.length < 4000, `context has ${text.length} chars`);
});
