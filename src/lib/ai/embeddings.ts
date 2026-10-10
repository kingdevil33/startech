import { AI_CONFIG } from "@/lib/constants";
import { getOpenAI } from "./openai";

const BATCH_SIZE = 64;

/** Embed a single string. Returns [] on failure so callers can degrade. */
export async function embedText(text: string): Promise<number[]> {
  const vectors = await embedBatch([text]);
  return vectors[0] ?? [];
}

/** Embed a batch of strings, preserving input order. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openai = getOpenAI();
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: AI_CONFIG.EMBEDDING_MODEL,
      input: batch,
      dimensions: AI_CONFIG.EMBEDDING_DIMENSIONS,
    });
    // Results are returned in input order; sort defensively by index.
    const sorted = [...response.data].sort((a, b) => a.index - b.index);
    embeddings.push(...sorted.map((d) => d.embedding));
  }

  return embeddings;
}
