export type OllamaConfig = {
  baseUrl: string;
  model: string;
  token?: string;
  allowLocal?: boolean;
};
export async function ollamaChat(
  config: OllamaConfig,
  system: string,
  input: string,
  request: typeof fetch = fetch,
) {
  const base = new URL(config.baseUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    (base.protocol !== "https:" &&
      !(config.allowLocal && local && base.protocol === "http:"))
  )
    throw Error(
      "Ollama precisa de uma conexão HTTPS autenticada no aplicativo publicado.",
    );
  if (!local && !config.token)
    throw Error("Configure a credencial da conexão com o Ollama.");
  const response = await request(`${base.href.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      options: { temperature: 0.3, num_predict: 700, num_ctx: 8192 },
    }),
    signal: AbortSignal.timeout(120000),
  }).catch(() => {
    throw Error(
      "Não consegui acessar o Ollama. Confira se o computador, o Ollama e a conexão do BODY OS estão ligados.",
    );
  });
  if (!response.ok)
    throw Error(
      response.status === 429
        ? "O computador está respondendo outra conversa. Tente novamente em instantes."
        : "Ollama indisponível. Verifique a conexão no computador e tente novamente.",
    );
  const result = (await response.json()) as {
    message?: { content?: string };
    done?: boolean;
  };
  if (!result.done || !result.message?.content?.trim())
    throw Error("Ollama não concluiu a resposta. Tente novamente.");
  return result.message.content.trim();
}
