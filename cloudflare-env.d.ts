declare namespace Cloudflare {
  interface Env {
    AI_PROVIDER?: string;
    OLLAMA_BASE_URL?: string;
    OLLAMA_MODEL?: string;
    OLLAMA_BRIDGE_TOKEN?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
