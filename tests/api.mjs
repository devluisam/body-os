import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const url = "http://localhost:5173",
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
assert.equal(before.body.foods.length, 26);
assert.equal(before.body.weight_logs.length, 1);
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
let d = (await request()).body;
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
d = (await request()).body;
assert.equal(d.meal_items.length, 1, "retry must not duplicate meal items");
const stale = { ...operation, mutationId: crypto.randomUUID() };
assert.equal((await request("/api/data", "POST", stale)).status, 409);
d = (await request()).body;
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
assert.equal((await request()).body.meal_items.length, 0);
await request("/api/photos", "DELETE", { id: photo.id });
console.log(
  "PASS: seed, daily upsert, server-side meal macros, atomic items, check-in/sleep, BF, validation, owner isolation, CSRF, contextual chat, private photo upload/read/delete, meal cascade.",
);
