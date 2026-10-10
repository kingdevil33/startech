import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyZoomWebhook } from "@/lib/zoom/webhook";

type ZoomEvent = {
  event: string;
  payload?: {
    plainToken?: string;
    object?: {
      id?: number;
      uuid?: string;
      join_url?: string;
      participant?: {
        user_name?: string;
        user_email?: string;
        join_time?: string;
        leave_time?: string;
        duration?: number;
      };
      object?: { id?: number };
    };
  };
};

/**
 * POST /api/webhooks/zoom
 * Handles URL validation, meeting lifecycle, and attendance tracking.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const authorization = request.headers.get("authorization");

  if (!verifyZoomWebhook(body, authorization)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ZoomEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // URL validation challenge from the Zoom app dashboard
  if (event.event === "endpoint.url_validation") {
    const plainToken = event.payload?.plainToken;
    if (!plainToken) {
      return NextResponse.json({ error: "Missing plainToken" }, { status: 400 });
    }
    return NextResponse.json({ plainToken });
  }

  const supabase = createAdminClient();
  const meetingId = event.payload?.object?.id ?? event.payload?.object?.object?.id;

  try {
    switch (event.event) {
      case "meeting.started": {
        if (meetingId) {
          await supabase
            .from("live_sessions")
            .update({ status: "live" })
            .filter("platform_data->>meeting_id", "eq", String(meetingId));
        }
        break;
      }

      case "meeting.ended": {
        if (meetingId) {
          await supabase
            .from("live_sessions")
            .update({ status: "completed" })
            .filter("platform_data->>meeting_id", "eq", String(meetingId));
        }
        break;
      }

      case "meeting.participant_joined":
      case "meeting.participant_left": {
        const participant = event.payload?.object?.participant;
        const email = participant?.user_email?.toLowerCase();
        if (!email || !meetingId) break;

        const { data: session } = await supabase
          .from("live_sessions")
          .select("id, cohort_id")
          .filter("platform_data->>meeting_id", "eq", String(meetingId))
          .maybeSingle();

        if (!session) break;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (!profile) break;

        if (event.event === "meeting.participant_joined") {
          await supabase.from("live_attendance").upsert(
            {
              session_id: session.id,
              user_id: profile.id,
              joined_at: participant?.join_time || new Date().toISOString(),
              source: "zoom_webhook",
            },
            { onConflict: "session_id,user_id,joined_at" }
          );
        } else {
          const joined = participant?.join_time
            ? new Date(participant.join_time).getTime()
            : null;
          const left = participant?.leave_time
            ? new Date(participant.leave_time).getTime()
            : Date.now();
          const minutes =
            joined !== null ? Math.max(0, Math.round((left - joined) / 60000)) : null;

          await supabase
            .from("live_attendance")
            .update({
              left_at: participant?.leave_time || new Date().toISOString(),
              duration_minutes: minutes,
            })
            .eq("session_id", session.id)
            .eq("user_id", profile.id)
            .is("left_at", null);
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Zoom webhook handling failed:", err);
    // Acknowledge anyway so Zoom does not disable the subscription
  }

  return NextResponse.json({ received: true });
}
