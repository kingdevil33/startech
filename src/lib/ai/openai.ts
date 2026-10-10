import OpenAI from "openai";

let client: OpenAI | null = null;

/** Lazily constructed OpenAI client (keeps `next build` env-free). */
export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
