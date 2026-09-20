import test from "node:test";
import assert from "node:assert/strict";
import {latest} from '../lib/body.ts';
import {
  TABLES,
  type Data,
  today,
  shift,
  weightMean,
  weightTrend,
  navyBF,
  readiness,
  foodMacros,
  FOOD_SEED,
  composition,
  schemas,
  mealIdea,
} from "../lib/body.ts";
const empty = () =>
  Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Data;

test('new measurements take precedence over undated seed timestamps',()=>{
 assert.equal(latest([{id:'seed',date:today(),weight:85},{id:'new',date:today(),weight:84,createdAt:new Date().toISOString()}])?.weight,84);
});
test("seven calendar days, not last seven entries", () => {
  const rows = [
    { id: "a", date: today(), weight: 85 },
    { id: "b", date: shift(today(), -6), weight: 83 },
    { id: "c", date: shift(today(), -7), weight: 90 },
  ];
  assert.equal(weightMean(rows), 84);
});
test("trend requires observations in both weeks", () => {
  assert.equal(weightTrend([{ id: "a", date: today(), weight: 85 }]), null);
});
test("BF handles centimeters and impossible values", () => {
  const bf = navyBF(177, 90, 38);
  assert.ok(bf && bf > 15 && bf < 25);
  assert.equal(navyBF(177, 30, 38), null);
});
test("readiness never invents missing check-in and stays bounded", () => {
  assert.equal(readiness(), null);
  assert.equal(
    readiness({
      id: "x",
      date: today(),
      hours: 8,
      quality: 10,
      energy: 10,
      fatigue: 0,
      soreness: 0,
      stress: 0,
    }),
    100,
  );
});
test("portion scales nutrients, independent of labels", () => {
  const f = FOOD_SEED.find((f) => f.name === "Arroz cozido")!;
  assert.equal(foodMacros(f, 150).calories, 192);
  assert.equal(foodMacros(f, 150).carbs, 42);
});
test("lean mass requires paired date", () => {
  const d = empty();
  d.weight_logs = [{ id: "w", date: today(), weight: 85 }];
  d.body_metrics = [{ id: "bf", date: shift(today(), -1), bf: 20 }];
  assert.equal(composition(d).lean, null);
  d.body_metrics[0].date = today();
  assert.equal(composition(d).lean, 68);
  assert.equal(composition(d).fat, 17);
});
test("reject negative and implausible measurements", () => {
  assert.equal(
    schemas.weight_logs!.safeParse({ date: today(), weight: -10 }).success,
    false,
  );
  assert.equal(
    schemas.body_metrics!.safeParse({
      date: today(),
      bf: 110,
      method: "Bioimpedância",
    }).success,
    false,
  );
});
test("planner uses available food without forcing missing beans", () => {
  const d = empty();
  d.foods = FOOD_SEED;
  const result = mealIdea("peixe arroz vinagrete", d);
  assert.equal(result.length, 3);
  assert.ok(result.every((r) => !r.name.includes("Feijão")));
});
