import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// Point BODYOS_URL at a dev server started with BODYOS_STATE_DIR, never at real records.
const url = process.env.BODYOS_URL ?? "http://localhost:5173",
  user = "body-os-test-" + Date.now(),
  headers = {
    "content-type": "application/json",
    "oai-authenticated-user-id": user,
    "oai-authenticated-user-email": "test@example.invalid",
  };
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
async function request(path = "/api/data", method = "GET", body) {
  const r = await fetch(url + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
}
const before = await request();
assert.equal(before.status, 200);
assert.equal(before.body.foods.length, 59);
// A new account starts with an empty profile, no weigh-in and no goals.
assert.equal(before.body.weight_logs.length, 0);
assert.equal(before.body.users[0].age, undefined);
assert.equal(before.body.goals.length, 0);
async function save(table, data) {
  const r = await request("/api/data", "POST", {
    table,
    data: { date, ...data },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.id;
}
await save("weight_logs", { weight: 84.7 });
await save("weight_logs", { weight: 84.6 });
const after = await request();
assert.equal(after.body.weight_logs.length, 1);
assert.equal(after.body.weight_logs[0].weight, 84.6);
const meal = await save("meals", {
  name: "Almoço de teste",
  time: "12:00",
  items: [
    { foodId: "food-0", grams: 150 },
    { foodId: "food-6", grams: 120 },
    { foodId: "food-7", grams: 80 },
  ],
});
let d = (await request("/api/data?scope=all")).body;
assert.ok(Math.abs(d.meals[0].calories - 452.9) < 1e-8);
assert.ok(Math.abs(d.meals[0].protein - 54.84) < 1e-8);
assert.equal(d.meal_items.length, 3);
const operation = {
  table: "meals",
  data: { ...d.meals[0], items: [{ foodId: "food-0", grams: 160 }] },
  mutationId: crypto.randomUUID(),
  baseVersion: d.meals[0].createdAt,
  expectedOwner: user,
};
const concurrent = await Promise.all([
  request("/api/data", "POST", operation),
  request("/api/data", "POST", operation),
]);
assert.ok(concurrent.every((r) => [200, 409].includes(r.status)));
assert.ok(concurrent.some((r) => r.status === 200));
assert.equal((await request("/api/data", "POST", operation)).status, 200);
d = (await request("/api/data?scope=all")).body;
assert.equal(d.meal_items.length, 1, "retry must not duplicate meal items");
const stale = { ...operation, mutationId: crypto.randomUUID() };
assert.equal((await request("/api/data", "POST", stale)).status, 409);
d = (await request("/api/data?scope=all")).body;
assert.equal(
  d.meal_items.length,
  1,
  "conflicting write must not remove dependent items",
);
assert.equal(
  (
    await request("/api/data", "POST", {
      ...stale,
      expectedOwner: "another-user",
    })
  ).status,
  403,
);
await save("daily_checkins", {
  hours: 8,
  quality: 8,
  hunger: 4,
  energy: 8,
  stress: 2,
  soreness: 2,
  motivation: 8,
  fatigue: 2,
  performance: 8,
  steps: 7500,
});
d = (await request()).body;
assert.equal(d.sleep_logs.length, 1);
// Without a height in the profile there is no BF estimate, never a guessed one.
await save("body_measurements", { date: "2026-01-01", waist: 88, abdomen: 90, neck: 38 });
d = (await request()).body;
assert.equal(d.body_metrics.length, 0);
await save("users", { date: d.users[0].date, sex: "male", age: 30, height: 175, lactoseIntolerant: false, bjjDays: [2, 4], bjjTime: "19:00", gymTime: "07:00" });
await save("body_measurements", { waist: 88, abdomen: 90, neck: 38 });
d = (await request()).body;
assert.ok(d.body_metrics[0].bf > 15 && d.body_metrics[0].bf < 25);
assert.equal(
  (
    await request("/api/data", "POST", {
      table: "weight_logs",
      data: { date, weight: -10 },
    })
  ).status,
  400,
);
assert.equal(
  (await request("/api/data", "POST", { table: "not_a_table", data: { date } }))
    .status,
  400,
);
const foreign = await fetch(url + "/api/data", {
  headers: { ...headers, "oai-authenticated-user-id": user + "-other" },
}).then((r) => r.json());
assert.equal(foreign.meals.length, 0);
const invalidOrigin = await fetch(url + "/api/data", {
  method: "POST",
  headers: { ...headers, origin: "https://wrong.invalid" },
  body: JSON.stringify({ table: "weight_logs", data: { date, weight: 85 } }),
});
assert.ok([400, 403].includes(invalidOrigin.status));
const chat = await request("/api/chat", "POST", {
  message: "Meu peso subiu hoje.",
});
assert.equal(chat.status, 200);
assert.equal(chat.body.mode, process.env.BODYOS_EXPECT_AI || "basic");
if (chat.body.mode === "basic") assert.ok(chat.body.response.includes("média"));
else
  assert.ok(
    typeof chat.body.response === "string" && chat.body.response.length > 20,
  );
const bytes = await readFile("public/icon-192.png"),
  form = new FormData();
form.set("date", date);
form.set("view", "Frente");
form.set("file", new Blob([bytes], { type: "image/png" }), "test.png");
const upload = await fetch(url + "/api/photos", {
  method: "POST",
  headers: {
    "oai-authenticated-user-id": user,
    "oai-authenticated-user-email": "test@example.invalid",
  },
  body: form,
});
const photo = await upload.json();
assert.equal(upload.status, 200, JSON.stringify(photo));
const photoGet = await fetch(url + "/api/photos?id=" + photo.id, { headers });
assert.equal(photoGet.status, 200);
const privateGet = await fetch(url + "/api/photos?id=" + photo.id, {
  headers: { ...headers, "oai-authenticated-user-id": user + "-other" },
});
assert.equal(privateGet.status, 404);
await request("/api/data", "DELETE", { table: "meals", id: meal });
assert.equal((await request("/api/data?scope=all")).body.meal_items.length, 0);
await request("/api/photos", "DELETE", { id: photo.id });
// The minute-by-minute read leaves out derived rows; the export keeps them.
await save("meals", { name: "Jantar", time: "20:00", items: [{ foodId: "food-0", grams: 100 }] });
assert.equal((await request()).body.meal_items.length, 0);
assert.equal((await request("/api/data?scope=all")).body.meal_items.length, 1);
// Unchanged account: 304 with no body.
const first = await fetch(url + "/api/data", { headers });
const etag = first.headers.get("etag");
assert.ok(etag);
const again = await fetch(url + "/api/data", { headers: { ...headers, "if-none-match": etag } });
assert.equal(again.status, 304);
assert.equal((await again.text()).length, 0);
assert.equal(again.headers.get("x-bodyos-owner"), encodeURIComponent(user));
// Steps left out of a check-in stay unmeasured, never 0.
const yesterday = new Date(Date.parse(date + "T12:00:00Z") - 86400000).toISOString().slice(0, 10);
await save("daily_checkins", { date: yesterday, hours: 7, quality: 7, hunger: 5, energy: 6, stress: 3, soreness: 3, fatigue: 4 });
d = (await request()).body;
const noSteps = d.daily_checkins.find((x) => x.date === yesterday);
assert.equal(noSteps.steps, undefined);
assert.equal((await fetch(url + "/api/data", { headers: { ...headers, "if-none-match": etag } })).status, 200, "a write changes the fingerprint");
// Closing a food day is one row per day.
await save("nutrition_days", { complete: true });
await save("nutrition_days", { complete: false });
d = (await request()).body;
assert.equal(d.nutrition_days.length, 1);
assert.equal(d.nutrition_days[0].id, "nutrition_days-" + date);
assert.equal(d.nutrition_days[0].complete, false);
// The profile is edited in place and keeps its id; it cannot be deleted.
const profileDate = d.users[0].date;
await save("users", { date: profileDate, sex: "male", age: 31, height: 175, lactoseIntolerant: false, bjjDays: [2, 4], bjjTime: "19:00", gymTime: "" });
d = (await request()).body;
assert.equal(d.users.length, 1);
assert.equal(d.users[0].id, "profile");
assert.equal(d.users[0].age, 31);
assert.equal(d.users[0].gymTime, undefined);
assert.equal((await request("/api/data", "DELETE", { table: "users", id: "profile" })).status, 400);
assert.equal((await request("/api/data", "DELETE", { table: "settings", id: "profile-settings" })).status, 400);
// Deleting a check-in also removes its sleep row.
await request("/api/data", "DELETE", { table: "daily_checkins", id: "daily_checkins-" + yesterday });
d = (await request()).body;
assert.ok(!d.sleep_logs.some((x) => x.date === yesterday));
console.log(
  "PASS: seed, daily upsert, server-side meal macros, atomic items, check-in/sleep, BF, validation, owner isolation, CSRF, contextual chat, private photo upload/read/delete, meal cascade, lean sync read and 304, unmeasured steps, closed food days, profile edit and delete guard, check-in cascade.",
);
