import test from "node:test";
import assert from "node:assert/strict";
import { ollamaChat } from "../lib/ollama.ts";

test("Ollama request preserves safety context and uses nonstreaming native API", async () => {
  const result = await ollamaChat(
    {
      baseUrl: "http://127.0.0.1:11434",
      model: "llama3.2:3b",
      allowLocal: true,
    },
    "system safety",
    "athlete context",
    async (url, init) => {
      assert.equal(String(url), "http://127.0.0.1:11434/api/chat");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.stream, false);
      assert.equal(body.messages[0].content, "system safety");
      assert.equal(body.messages[1].content, "athlete context");
      assert.equal(init?.redirect, "manual");
      return Response.json({
        message: { content: "Resposta local" },
        done: true,
      });
    },
  );
  assert.equal(result, "Resposta local");
});
test("production rejects plain HTTP and remote connections without authentication", async () => {
  await assert.rejects(
    ollamaChat({ baseUrl: "http://127.0.0.1:11434", model: "test" }, "", ""),
    /HTTPS/,
  );
  await assert.rejects(
    ollamaChat({ baseUrl: "https://pc.example", model: "test" }, "", ""),
    /credencial/,
  );
  await assert.rejects(
    ollamaChat(
      { baseUrl: "https://pc.example", model: "test", token: "test" },
      "",
      "",
      async () => Response.json({ message: { content: "" }, done: true }),
    ),
    /concluiu/,
  );
});
