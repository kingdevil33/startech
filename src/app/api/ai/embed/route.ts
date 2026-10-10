import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestLessonContent } from "@/lib/ai/ingest";

const schema = z
  .object({
    lessonId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
  })
  .refine((v) => v.lessonId || v.courseId, {
    message: "lessonId or courseId is required",
  });

/**
 * POST /api/ai/embed — (re)index course content into pgvector for RAG.
 * Instructor/admin only; uses the service-role client because
 * `content_chunks` writes are gated to staff under RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" && profile?.role !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    let lessonIds: string[] = [];

    if (parsed.data.lessonId) {
      lessonIds = [parsed.data.lessonId];
    } else {
      const { data: lessons } = await admin
        .from("lessons")
        .select("id, week:weeks!inner (course_id, is_published)")
        .eq("weeks.course_id", parsed.data.courseId!)
        .eq("weeks.is_published", true);

      lessonIds = (lessons || []).map((l) => l.id);
    }

    let indexed = 0;
    for (const lessonId of lessonIds) {
      try {
        await ingestLessonContent(admin, lessonId);
        indexed += 1;
      } catch (err) {
        console.error(`Indexing lesson ${lessonId} failed:`, err);
      }
    }

    return NextResponse.json({ indexed, total: lessonIds.length });
  } catch (err) {
    console.error("Embed job failed:", err);
    return NextResponse.json(
      { error: "Indexing failed" },
      { status: 500 }
    );
  }
}
