import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signPlaybackToken } from "@/lib/mux/playback";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({ playbackId: z.string().min(1) });

/**
 * POST /api/mux/playback — exchange a Mux playback ID for a short-lived
 * signed token. Requires an active enrollment in the lesson's course
 * (or instructor/admin), except for free-preview lessons.
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

    const limit = await checkRateLimit(apiRateLimit, `api:${user.id}`);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: asset } = await supabase
      .from("mux_assets")
      .select("mux_playback_id, lesson_id")
      .eq("mux_playback_id", parsed.data.playbackId)
      .maybeSingle();

    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, is_free_preview, week_id, week:weeks (course_id)")
      .eq("id", asset.lesson_id)
      .single();

    const week = Array.isArray(lesson?.week)
      ? (lesson?.week as unknown as { course_id?: string }[])[0]
      : (lesson?.week as unknown as { course_id?: string } | null);

    const courseId = week?.course_id;

    // Staff and enrolled students may watch; free previews are public.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isStaff =
      profile?.role === "admin" ||
      profile?.role === "instructor" ||
      profile?.role === "teaching_assistant";

    let hasAccess = Boolean(lesson?.is_free_preview) || isStaff;

    if (!hasAccess && courseId) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id, cohort:cohorts (course_id)")
        .eq("user_id", user.id)
        .in("status", ["active", "completed"]);

      hasAccess = (enrollments || []).some((e) => {
        const cohort = Array.isArray(e.cohort)
          ? (e.cohort as unknown as { course_id?: string }[])[0]
          : (e.cohort as unknown as { course_id?: string } | null);
        return cohort?.course_id === courseId;
      });
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }

    const token = await signPlaybackToken({
      playbackId: parsed.data.playbackId,
      expiration: "15m",
      type: "video",
    });

    return NextResponse.json({ token, playbackId: parsed.data.playbackId });
  } catch (err) {
    console.error("Playback token error:", err);
    return NextResponse.json(
      { error: "Could not sign playback" },
      { status: 500 }
    );
  }
}
