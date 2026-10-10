import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createYouTubeBroadcast,
  hasYouTubeCredentials,
} from "@/lib/youtube";

const schema = z.object({
  cohortId: z.string().uuid(),
  weekId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  privacyStatus: z.enum(["public", "unlisted", "private"]).default("unlisted"),
});

/** POST /api/youtube/create-broadcast — instructor schedules a YT live session. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    if (!hasYouTubeCredentials()) {
      return NextResponse.json(
        { error: "YouTube is not configured" },
        { status: 503 }
      );
    }

    const { data: cohort } = await supabase
      .from("cohorts")
      .select("id, course_id")
      .eq("id", input.cohortId)
      .single();

    if (!cohort) {
      return NextResponse.json({ error: "Cohort not found" }, { status: 404 });
    }

    const { data: isStaff } = await supabase.rpc("is_instructor_or_admin");
    const { data: isCourseLead } = await supabase.rpc("is_course_instructor", {
      p_course_id: cohort.course_id,
    });

    if (!isStaff && !isCourseLead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const broadcast = await createYouTubeBroadcast({
      title: input.title,
      description: input.description,
      scheduledStartTime: input.scheduledAt,
      privacyStatus: input.privacyStatus,
    });

    const { data: session, error } = await supabase
      .from("live_sessions")
      .insert({
        cohort_id: input.cohortId,
        week_id: input.weekId ?? null,
        title: input.title,
        description: input.description ?? null,
        platform: "youtube",
        status: "scheduled",
        scheduled_at: input.scheduledAt,
        duration_minutes: input.durationMinutes,
        join_url: broadcast.watchUrl,
        host_id: user.id,
        platform_data: {
          broadcast_id: broadcast.broadcastId,
          stream_id: broadcast.streamId,
          stream_url: broadcast.streamUrl,
          stream_key: broadcast.streamKey,
          watch_url: broadcast.watchUrl,
        },
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session, broadcast });
  } catch (err) {
    console.error("YouTube broadcast creation failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create broadcast",
      },
      { status: 502 }
    );
  }
}
