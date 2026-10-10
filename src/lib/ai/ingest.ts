import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_CONFIG } from "@/lib/constants";
import { embedBatch } from "./embeddings";

type Chunk = {
  content: string;
  content_type: "lesson_text" | "transcript" | "resource";
};

/** Split text into overlapping word-window chunks. */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= chunkSize) return [words.join(" ")];

  const step = Math.max(1, chunkSize - overlap);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += step) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
    if (i + chunkSize >= words.length) break;
  }
  return chunks;
}

/** Strip WebVTT formatting down to plain transcript text. */
export function vttToText(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (/^WEBVTT/i.test(line)) return false;
      if (/^NOTE\b/.test(line)) return false;
      if (/^STYLE\b/.test(line)) return false;
      if (line.includes("-->")) return false;
      if (/^\d+$/.test(line)) return false;
      if (/^[A-Za-z-]+:\s/.test(line)) return false; // cue settings / headers
      return true;
    })
    .join(" ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Rebuild the RAG chunks for a lesson from its text content and video
 * transcript, embedding them into `content_chunks`.
 *
 * Called by the Mux `video.asset.ready` webhook with the service-role client.
 */
export async function ingestLessonContent(
  supabase: SupabaseClient,
  lessonId: string
): Promise<void> {
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      `id, title, content, week_id,
       week:weeks (id, course_id, week_number)`
    )
    .eq("id", lessonId)
    .single();

  if (!lesson) return;

  const week = Array.isArray(lesson.week)
    ? (lesson.week as unknown as { course_id: string; week_number: number }[])[0]
    : (lesson.week as unknown as { course_id: string; week_number: number });

  if (!week?.course_id) return;

  const { data: muxAsset } = await supabase
    .from("mux_assets")
    .select("transcript")
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const sources: { text: string; type: Chunk["content_type"] }[] = [];
  if (lesson.content?.trim()) {
    sources.push({ text: lesson.content, type: "lesson_text" });
  }
  if (muxAsset?.transcript?.trim()) {
    sources.push({ text: muxAsset.transcript, type: "transcript" });
  }

  if (sources.length === 0) return;

  const chunks: Chunk[] = [];
  for (const source of sources) {
    const parts = chunkText(
      source.text,
      AI_CONFIG.CHUNK_SIZE,
      AI_CONFIG.CHUNK_OVERLAP
    );
    for (const content of parts) {
      chunks.push({ content, content_type: source.type });
    }
  }

  if (chunks.length === 0) return;

  // Replace any previous index for this lesson
  await supabase.from("content_chunks").delete().eq("lesson_id", lessonId);

  const metadata = {
    lesson_title: lesson.title,
    week_number: week.week_number,
  };

  try {
    const embeddings = await embedBatch(chunks.map((c) => c.content));

    const rows = chunks.map((chunk, i) => ({
      course_id: week.course_id,
      lesson_id: lessonId,
      week_id: lesson.week_id,
      content: chunk.content,
      content_type: chunk.content_type,
      metadata,
      chunk_index: i,
      embedding: JSON.stringify(embeddings[i]),
    }));

    // Insert in batches to keep request bodies reasonable
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase
        .from("content_chunks")
        .insert(rows.slice(i, i + 50));
      if (error) throw error;
    }
  } catch (err) {
    console.error("Lesson content ingestion failed:", err);
  }
}
