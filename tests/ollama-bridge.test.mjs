import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createBridge } from "../scripts/ollama-bridge.mjs";
test("bridge authenticates and exposes only bounded chat with a fixed local model", async () => {
  const token = "test-only-".repeat(8);
  let called = 0;
  const server = createBridge({
    token,
    request: async (url, init) => {
      called++;
      assert.equal(url, "http://127.0.0.1:11434/api/chat");
      const body = JSON.parse(init.body);
      assert.equal(body.model, "llama3.2:3b");
      assert.equal(body.options.num_predict, 700);
      return Response.json({ message: { content: "ok" }, done: true });
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(
      (await fetch(url + "/api/chat", { method: "POST" })).status,
      401,
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    assert.equal(
      (await fetch(url + "/api/pull", { method: "POST", headers })).status,
      404,
    );
    assert.equal(
      (
        await fetch(url + "/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({ messages: [] }),
        })
      ).status,
      400,
    );
    const response = await fetch(url + "/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "arbitrary",
        options: { num_predict: 999999 },
        messages: [{ role: "user", content: "Hi" }],
      }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).message.content, "ok");
    assert.equal(called, 1);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
