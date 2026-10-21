import { env } from "cloudflare:workers";
import { owner, guard, readData, put, failure } from "@/lib/server";
import { today, targets, composition } from "@/lib/body";
import { coach, SAFETY } from "@/lib/coach";
import { nextStep } from "@/lib/decisions";
import { ollamaChat } from "@/lib/ollama";
export async function GET(req: Request) {
  try {
    owner(req);
    const ollama = env.AI_PROVIDER === "ollama";
    return Response.json(
      {
        mode:
          ollama && env.OLLAMA_BASE_URL
            ? "ollama"
            : !ollama && env.OPENAI_API_KEY
              ? "ai"
              : "basic",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    guard(req);
    const user = owner(req),
      { message } = (await req.json()) as { message?: unknown };
    if (typeof message !== "string" || !message.trim() || message.length > 2000)
      throw Error("Escreva uma mensagem de até 2.000 caracteres");
    const data = await readData(user);
    if (data.ai_conversations.filter((x) => x.date === today()).length >= 100)
      throw Error(
        "Limite diário de 100 conversas alcançado. Tente novamente amanhã.",
      );
    let response = /faço agora|faco agora/i.test(message)
        ? nextStep(data)
        : coach(message, data),
      mode = "basic";
    if (env.AI_PROVIDER === "ollama" && env.OLLAMA_BASE_URL) {
      const context = Object.fromEntries(
        Object.entries(data)
          .filter(
            ([k]) =>
              ![
                "progress_photos",
                "meal_items",
                "foods",
                "weekly_reports",
              ].includes(k),
          )
          .map(([k, rows]) => [
            k,
            [...rows]
              .sort(
                (a, b) =>
                  b.date.localeCompare(a.date) ||
                  String(b.createdAt ?? "").localeCompare(
                    String(a.createdAt ?? ""),
                  ),
              )
              .slice(0, k === "ai_conversations" ? 4 : 14),
          ]),
      );
      response = await ollamaChat(
        {
          baseUrl: env.OLLAMA_BASE_URL,
          model: env.OLLAMA_MODEL || "llama3.2:3b",
          token: env.OLLAMA_BRIDGE_TOKEN,
          allowLocal: import.meta.env.DEV,
        },
        SAFETY,
        JSON.stringify({
          context,
          targets: targets(data),
          composition: composition(data),
          message,
        }),
      );
      mode = "ollama";
    } else if (env.AI_PROVIDER !== "ollama" && env.OPENAI_API_KEY) {
      const context = Object.fromEntries(
        Object.entries(data)
          .filter(
            ([k]) => !["progress_photos", "meal_items", "foods"].includes(k),
          )
          .map(([k, v]) => [k, v.slice(0, k === "ai_conversations" ? 12 : 90)]),
      );
      const r = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-5.4-mini",
          store: false,
          max_output_tokens: 1200,
          instructions: SAFETY,
          input: [
            {
              role: "user",
              content: JSON.stringify({
                context,
                targets: targets(data),
                composition: composition(data),
                message,
              }),
            },
          ],
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok)
        throw Error(
          "A IA está indisponível. Tente novamente; os seus registros estão preservados.",
        );
      const j = (await r.json()) as {
        output?: { content?: { type: string; text: string }[] }[];
      };
      response = j.output
        ?.flatMap((x) => x.content ?? [])
        .filter((x) => x.type === "output_text")
        .map((x) => x.text)
        .join("\n") ?? "";
      if (!response) throw Error("A IA não retornou texto. Tente novamente.");
      mode = "ai";
    }
    const row = {
      id: crypto.randomUUID(),
      date: today(),
      createdAt: new Date().toISOString(),
      message,
      response,
      mode,
    };
    await put("ai_conversations", user, row).run();
    return Response.json(row);
  } catch (e) {
    return failure(e);
  }
}
