import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "@/lib/constants";
import { embedText } from "./embeddings";
import type { RagChunk } from "./system-prompt";

type Client = SupabaseClient;

/**
 * Which weeks of a course are unlocked for a student right now.
 * Content drip: week N unlocks at cohort start + (N-1) weeks.
 */
export async function getUnlockedWeekNumbers(
  supabase: Client,
  courseId: string,
  cohortId: string
): Promise<number[]> {
  const [{ data: cohort }, { data: weeks }] = await Promise.all([
    supabase.from("cohorts").select("starts_at").eq("id", cohortId).single(),
    supabase
      .from("weeks")
      .select("week_number")
      .eq("course_id", courseId)
      .eq("is_published", true),
  ]);

  const cohortStart = cohort ? new Date(cohort.starts_at) : new Date();
  const now = new Date();

  return (weeks || [])
    .filter((w) => {
      const unlockDate = new Date(cohortStart);
      unlockDate.setDate(unlockDate.getDate() + (w.week_number - 1) * 7);
      return now >= unlockDate;
    })
    .map((w) => w.week_number);
}

export type RetrieveParams = {
  query: string;
  courseId: string;
  unlockedWeekNumbers: number[];
  limit?: number;
};

/**
 * Semantic search over `content_chunks` for the student's course,
 * restricted to weeks they have unlocked.
 *
 * Returns [] when embeddings are unavailable (no OpenAI key) so the chat
 * route can still respond without citations instead of failing.
 */
export async function retrieveChunks(
  supabase: Client,
  params: RetrieveParams
): Promise<RagChunk[]> {
  const queryEmbedding = await embedText(params.query);
  if (queryEmbedding.length === 0) return [];

  const { data, error } = await supabase.rpc("search_content_chunks", {
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_course_id: params.courseId,
    p_unlocked_week_numbers: params.unlockedWeekNumbers,
    p_limit: params.limit ?? AI_CONFIG.TOP_K_CHUNKS,
  });

  if (error) {
    console.error("search_content_chunks failed:", error.message);
    return [];
  }

  return (data as unknown as RagChunk[]) ?? [];
}

/** Fetch a student's AI usage for the current month (UTC). */
export async function getMonthlyUsage(
  supabase: Client,
  userId: string,
  courseId: string,
  monthYear = new Date().toISOString().slice(0, 7)
): Promise<{ questionCount: number; monthYear: string }> {
  const { data } = await supabase
    .from("ai_usage")
    .select("question_count")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .eq("month_year", monthYear)
    .maybeSingle();

  return { questionCount: data?.question_count ?? 0, monthYear };
}
