import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createZoomMeeting, hasZoomCredentials } from "@/lib/zoom";

const schema = z.object({
  cohortId: z.string().uuid(),
  weekId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480).default(60),
  timezone: z.string().default("Africa/Accra"),
});

/** POST /api/zoom/create-meeting — instructor creates a Zoom live session. */
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

    if (!hasZoomCredentials()) {
      return NextResponse.json(
        { error: "Zoom is not configured" },
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

    const meeting = await createZoomMeeting({
      topic: input.title,
      startTime: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      timezone: input.timezone,
      agenda: input.description,
    });

    const { data: session, error } = await supabase
      .from("live_sessions")
      .insert({
        cohort_id: input.cohortId,
        week_id: input.weekId ?? null,
        title: input.title,
        description: input.description ?? null,
        platform: "zoom",
        status: "scheduled",
        scheduled_at: input.scheduledAt,
        duration_minutes: input.durationMinutes,
        join_url: meeting.join_url,
        host_id: user.id,
        platform_data: {
          meeting_id: meeting.id,
          start_url: meeting.start_url,
          password: meeting.password,
        },
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ session, meeting: { id: meeting.id } });
  } catch (err) {
    console.error("Zoom meeting creation failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not create meeting",
      },
      { status: 502 }
    );
  }
}
