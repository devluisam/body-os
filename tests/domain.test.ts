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
  mealPlan,
  slotAt,
  MEAL_SLOTS,
  targets,
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
test("the day is split into meals whose targets add up to the daily goal", () => {
  const data = empty();
  data.foods = FOOD_SEED;
  const plan = mealPlan(data),
    goal = targets(data);
  assert.equal(plan.slots.length, MEAL_SLOTS.length);
  assert.ok(
    Math.abs(
      plan.slots.reduce((a, s) => a + s.target.calories, 0) - goal.calories,
    ) <= 5,
  );
  assert.equal(mealPlan(data, today(), "06:00").next?.name, MEAL_SLOTS[0].name);
  assert.equal(mealPlan(data, today(), "19:00").next?.name, "Jantar");
});
test("a logged meal marks its slot and shrinks what is left of it", () => {
  const data = empty();
  data.foods = FOOD_SEED;
  data.meals = [
    {
      id: "m1",
      date: today(),
      name: "Café da manhã",
      time: "07:30",
      calories: 400,
      protein: 30,
      items: [],
    },
  ];
  const slot = mealPlan(data).slots.find((s) => s.name === "Café da manhã")!;
  assert.equal(slot.done, true);
  assert.equal(slot.logged.calories, 400);
  assert.equal(slot.remaining, slot.target.calories - 400);
  assert.equal(
    mealPlan(data, today(), "07:45").next?.name,
    "Lanche da manhã",
  );
});
test("meals without a plan name are counted by their clock time", () => {
  const data = empty();
  data.foods = FOOD_SEED;
  data.meals = [
    {
      id: "m1",
      date: today(),
      name: "Refeição livre",
      time: "20:10",
      calories: 600,
      protein: 40,
      items: [],
    },
  ];
  const plan = mealPlan(data);
  assert.equal(plan.slots.find((s) => s.name === "Jantar")?.logged.calories, 600);
  assert.equal(
    plan.slots.reduce((a, s) => a + s.logged.calories, 0),
    plan.eaten.calories,
  );
  assert.equal(slotAt("20:10").name, "Jantar");
});
test("the chosen meal changes what is suggested and how much of it", () => {
  const data = empty();
  data.foods = FOOD_SEED;
  const input = "tenho ovos cozidos e arroz cozido";
  assert.equal(
    mealIdea(input, data, 5, false, "Café da manhã")[0].name,
    "Ovos cozidos",
  );
  assert.equal(mealIdea(input, data)[0].name, "Arroz cozido");
  const plate = "tenho frango grelhado, arroz cozido e azeite";
  const kcal = (slot?: string) =>
    mealIdea(plate, data, 5, false, slot).reduce((a, x) => a + x.calories, 0);
  assert.ok(kcal("Almoço") > kcal("Café da manhã"));
  assert.ok(kcal("Café da manhã") > kcal("Ceia"));
  // Oils and condiments keep their small amount whatever the meal is.
  const oil = (slot: string) =>
    mealIdea(plate, data, 5, false, slot).find((x) => x.name === "Azeite")!;
  assert.equal(oil("Almoço").grams, oil("Ceia").grams);
});
