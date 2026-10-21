export type OllamaConfig = {
  baseUrl: string;
  model: string;
  token?: string;
  allowLocal?: boolean;
};
export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ChatOptions = {
  // Earlier turns go in as real messages, so the model keeps the thread.
  history?: ChatTurn[];
  // When set, the reply is streamed and each piece is passed here as it arrives.
  onToken?: (text: string) => void;
};
type Piece = { message?: { content?: string }; done?: boolean };
export async function ollamaChat(
  config: OllamaConfig,
  system: string,
  input: string,
  request: typeof fetch = fetch,
  { history = [], onToken }: ChatOptions = {},
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
      stream: !!onToken,
      messages: [
        { role: "system", content: system },
        ...history,
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
  if (!onToken) {
    const result = (await response.json()) as Piece;
    if (!result.done || !result.message?.content?.trim())
      throw Error("Ollama não concluiu a resposta. Tente novamente.");
    return result.message.content.trim();
  }
  // Native streaming sends one JSON object per line; the last has done: true.
  if (!response.body)
    throw Error("Ollama não concluiu a resposta. Tente novamente.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    text = "",
    done = false;
  const take = (line: string) => {
    if (!line.trim()) return;
    const piece = JSON.parse(line) as Piece;
    const content = piece.message?.content ?? "";
    if (content) {
      text += content;
      onToken(content);
    }
    if (piece.done) done = true;
  };
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(take);
  }
  take(buffer);
  if (!done || !text.trim())
    throw Error("Ollama não concluiu a resposta. Tente novamente.");
  return text.trim();
}
