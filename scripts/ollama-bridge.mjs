import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";

export function createBridge({
  token,
  model = "llama3.2:3b",
  upstream = "http://127.0.0.1:11434",
  request = fetch,
}) {
  if (!token || token.length < 40)
    throw Error("Configure uma credencial de pelo menos 40 caracteres.");
  let busy = false,
    windowStart = 0,
    count = 0;
  return createServer(async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    };
    const provided = Buffer.from(req.headers.authorization ?? ""),
      expected = Buffer.from(`Bearer ${token}`);
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      reply(401, { error: "Unauthorized" });
      req.resume();
      return;
    }
    if (req.url === "/health" && req.method === "GET") {
      reply(200, { ok: true, model });
      return;
    }
    if (req.url !== "/api/chat" || req.method !== "POST") {
      reply(404, { error: "Not found" });
      req.resume();
      return;
    }
    if (busy) {
      reply(429, { error: "Busy" });
      req.resume();
      return;
    }
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      count = 0;
    }
    if (++count > 20) {
      reply(429, { error: "Rate limit" });
      req.resume();
      return;
    }
    busy = true;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 131072) {
          reply(413, { error: "Too large" });
          return;
        }
        chunks.push(chunk);
      }
      const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        !Array.isArray(input.messages) ||
        !input.messages.length ||
        input.messages.length > 20 ||
        input.messages.some(
          (m) =>
            !["system", "user", "assistant"].includes(m.role) ||
            typeof m.content !== "string" ||
            m.content.length > 70000,
        )
      ) {
        reply(400, { error: "Invalid messages" });
        return;
      }
      const stream = input.stream === true;
      const result = await request(`${upstream}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: input.messages,
          stream,
          options: { num_ctx: 8192, num_predict: 700, temperature: 0.3 },
        }),
        signal: AbortSignal.timeout(115000),
      });
      if (!result.ok) {
        reply(502, { error: "Ollama unavailable" });
        return;
      }
      if (stream && result.body) {
        // Relays only the reply text and the end marker, line by line, so the
        // app can show the answer as it is generated.
        res.writeHead(200, {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
        });
        const decoder = new TextDecoder();
        let buffer = "";
        const relay = (line) => {
          if (!line.trim()) return;
          const piece = JSON.parse(line);
          res.write(
            JSON.stringify({
              message: {
                role: "assistant",
                content: piece.message?.content ?? "",
              },
              done: piece.done === true,
            }) + "\n",
          );
        };
        for await (const chunk of result.body) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(relay);
        }
        relay(buffer);
        res.end();
        return;
      }
      const data = await result.json();
      reply(200, {
        message: { role: "assistant", content: data.message?.content ?? "" },
        done: data.done === true,
      });
    } catch {
      if (!res.headersSent)
        reply(502, { error: "Unable to generate response" });
    } finally {
      busy = false;
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const path = process.argv[2] ?? "work/ollama-bridge.env";
  const config = parseEnv(readFileSync(path, "utf8"));
  const server = createBridge({
    token: config.OLLAMA_BRIDGE_TOKEN,
    model: config.OLLAMA_MODEL,
  });
  server.requestTimeout = 150000;
  server.headersTimeout = 15000;
  server.listen(11435, "127.0.0.1", () =>
    console.log("BODY OS: conexão local pronta em 127.0.0.1:11435."),
  );
}
