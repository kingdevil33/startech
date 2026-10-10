import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRON_UNAUTHORIZED, verifyCronSecret } from "@/lib/cron";
import { ingestLessonContent } from "@/lib/ai/ingest";

const MAX_LESSONS_PER_RUN = 40;

/**
 * POST /api/cron/reindex
 * Rebuilds RAG chunks/embeddings for recently changed lessons.
 * Optional JSON body: { courseId?: string } to scope to one course.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(CRON_UNAUTHORIZED.json, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const courseId =
    body && typeof body === "object"
      ? (body as { courseId?: string }).courseId
      : undefined;

  const admin = createAdminClient();

  let query = admin
    .from("lessons")
    .select("id, updated_at, week:weeks!inner (course_id, is_published)")
    .eq("weeks.is_published", true)
    .order("updated_at", { ascending: false })
    .limit(MAX_LESSONS_PER_RUN);

  if (courseId) query = query.eq("weeks.course_id", courseId);

  const { data: lessons, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let indexed = 0;
  const errors: string[] = [];

  for (const lesson of lessons ?? []) {
    try {
      await ingestLessonContent(admin, lesson.id);
      indexed += 1;
    } catch (err) {
      errors.push(
        `${lesson.id}: ${err instanceof Error ? err.message : "failed"}`
      );
    }
  }

  return NextResponse.json({ indexed, total: lessons?.length ?? 0, errors });
}
