import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { TABLES, FOOD_SEED } from "../lib/body.ts";
import type { Data } from "../lib/body.ts";
import {
  synchronize,
  enqueue,
  cached,
  project,
  discardPending,
} from "../lib/offline.ts";

test("offline queue survives loss of connection, isolates accounts and retains conflicts", async () => {
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request: async (_name: string, fn: () => unknown) => await fn() },
  });
  let connected = true,
    account = "athlete-a",
    conflict = false,
    failAfterPost = false,
    posts = 0;
  const data = Object.fromEntries(
    TABLES.map((t) => [t, []]),
  ) as unknown as Data;
  data.foods = FOOD_SEED;
  const operations = new Set<string>();
  globalThis.fetch = async (_input, init) => {
    if (!connected) throw new TypeError("offline");
    if (account === "unauthorized")
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (init?.method === "POST") {
      posts++;
      const p = JSON.parse(String(init.body));
      assert.equal(p.expectedOwner, account);
      if (conflict)
        return Response.json({ error: "Conflito" }, { status: 409 });
      if (!operations.has(p.mutationId)) {
        operations.add(p.mutationId);
        data[p.table as keyof Data] = [
          { ...p.data, createdAt: "server-version" },
          ...data[p.table as keyof Data].filter((x) => x.id !== p.data.id),
        ];
      }
      if (failAfterPost) {
        connected = false;
        throw new TypeError("response lost");
      }
      return Response.json({ ok: true });
    }
    return Response.json(data, { headers: { "X-BodyOS-Owner": account } });
  };
  await synchronize();
  connected = false;
  await enqueue("weight_logs", { weight: 84.5 });
  await enqueue("weight_logs", { weight: 84.4 });
  const state = await cached();
  assert.equal(state!.pending.length, 1);
  assert.equal(
    project(state!.data, state!.pending).weight_logs[0].weight,
    84.4,
  );
  assert.equal((await synchronize()).online, false);
  connected = true;
  failAfterPost = true;
  await synchronize();
  assert.equal((await cached())!.pending.length, 1);
  connected = true;
  failAfterPost = false;
  await synchronize();
  assert.equal((await cached())!.pending.length, 0);
  assert.equal(data.weight_logs.length, 1);
  assert.equal(posts, 2);
  await enqueue("water_logs", { ml: 300 });
  account = "athlete-b";
  await synchronize();
  assert.equal((await cached())!.pending.length, 0);
  assert.equal(posts, 2, "do not replay another account's queue");
  account = "athlete-a";
  conflict = true;
  const result = await synchronize();
  assert.equal(result.cache.pending.length, 1);
  assert.equal(result.cache.pending[0].error, "Conflito");
  await synchronize();
  assert.equal(posts, 3, "do not keep retrying conflicts");
  await discardPending(result.cache.pending[0].mutationId);
  assert.equal((await cached())!.pending.length, 0);
  account = "unauthorized";
  await assert.rejects(synchronize, /Entre novamente/);
  assert.equal(
    await cached(),
    undefined,
    "lock cached data after authentication rejection",
  );
});
test("an unchanged account answers 304 and keeps the local copy", async () => {
  const data = Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as Data;
  data.weight_logs = [{ id: "weight_logs-2026-10-01", date: "2026-10-01", weight: 84 }];
  let full = 0,
    conditional = 0,
    owner = "athlete-etag";
  globalThis.fetch = async (_input, init) => {
    if (init?.method === "POST") return Response.json({ ok: true });
    const sent = new Headers(init?.headers).get("If-None-Match");
    const headers = { "X-BodyOS-Owner": owner, ETag: `"v1-${owner}"` };
    if (sent === `"v1-${owner}"`) {
      conditional++;
      return new Response(null, { status: 304, headers });
    }
    full++;
    return Response.json(data, { headers });
  };
  const first = await synchronize();
  assert.equal(first.changed, true);
  const second = await synchronize();
  assert.equal(second.changed, false);
  assert.equal(conditional, 1);
  assert.equal(second.cache.data.weight_logs[0].weight, 84);
  // A different account never reuses this copy, even with a 304.
  owner = "athlete-other";
  const other = await synchronize();
  assert.equal(other.cache.owner, "athlete-other");
  assert.equal(full, 2);
});
