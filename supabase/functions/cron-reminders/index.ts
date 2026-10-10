import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  createServiceClient,
  verifyCronAuth,
} from "../_shared/supabase.ts";

type ReminderWindow = {
  flag: "reminder_24h_sent" | "reminder_1h_sent";
  startMs: number;
  endMs: number;
  minutesUntil: number;
  label: string;
};

function formatInTimezone(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toUTCString();
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "noreply@startech.com",
        to: [to],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error(
      "Email send failed:",
      err instanceof Error ? err.message : "unknown"
    );
  }
}

function reminderHtml(params: {
  title: string;
  startTime: string;
  platform: string;
  timezone: string;
  joinUrl?: string | null;
  minutesUntil: number;
}): string {
  const joinLink = params.joinUrl
    ? `<p><a href="${escapeHtml(params.joinUrl)}">Join the session</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:sans-serif">
<p>Your live session starts in about ${params.minutesUntil} minutes.</p>
<h2>${escapeHtml(params.title)}</h2>
<p>${escapeHtml(params.startTime)} (${escapeHtml(params.timezone)})</p>
<p>Platform: ${escapeHtml(params.platform)}</p>
${joinLink}
</body></html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const { headers, preflight } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  }

  if (!verifyCronAuth(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401, headers);
  }

  const admin = createServiceClient();
  const now = Date.now();

  const windows: ReminderWindow[] = [
    {
      flag: "reminder_24h_sent",
      startMs: now + 23 * 3600_000,
      endMs: now + 25 * 3600_000,
      minutesUntil: 1440,
      label: "24h",
    },
    {
      flag: "reminder_1h_sent",
      startMs: now + 45 * 60_000,
      endMs: now + 75 * 60_000,
      minutesUntil: 60,
      label: "1h",
    },
  ];

  let sessionsProcessed = 0;
  let notificationsSent = 0;
  const errors: string[] = [];

  for (const window of windows) {
    const { data: sessions, error: sessionError } = await admin
      .from("live_sessions")
      .select(
        "id, title, scheduled_at, duration_minutes, join_url, platform, cohort_id"
      )
      .eq("status", "scheduled")
      .eq(window.flag, false)
      .gte("scheduled_at", new Date(window.startMs).toISOString())
      .lte("scheduled_at", new Date(window.endMs).toISOString());

    if (sessionError) {
      errors.push(sessionError.message);
      continue;
    }

    for (const session of sessions ?? []) {
      try {
        const { data: cohort } = await admin
          .from("cohorts")
          .select("timezone, name")
          .eq("id", session.cohort_id)
          .single();

        const timezone = cohort?.timezone || "Africa/Accra";
        const startTime = formatInTimezone(session.scheduled_at, timezone);

        const { data: enrollments } = await admin
          .from("enrollments")
          .select("user_id, profile:profiles (email, full_name)")
          .eq("cohort_id", session.cohort_id)
          .eq("status", "active");

        for (const enrollment of enrollments ?? []) {
          const profile = Array.isArray(enrollment.profile)
            ? (enrollment.profile as unknown as {
                email?: string;
                full_name?: string;
              }[])[0]
            : (enrollment.profile as unknown as {
                email?: string;
                full_name?: string;
              } | null);

          if (!profile?.email) continue;

          await admin.rpc("create_notification", {
            p_user_id: enrollment.user_id,
            p_type: "session_reminder",
            p_title: `Starting ${window.label}: ${session.title}`,
            p_body: `Live session starts at ${startTime} (${timezone}).`,
            p_link: "/dashboard",
            p_cohort_id: session.cohort_id,
          });

          await sendEmail(
            profile.email,
            `Starting soon: ${session.title}`,
            reminderHtml({
              title: session.title,
              startTime,
              platform: session.platform,
              timezone,
              joinUrl: session.join_url,
              minutesUntil: window.minutesUntil,
            })
          );

          notificationsSent += 1;
        }

        await admin
          .from("live_sessions")
          .update({ [window.flag]: true })
          .eq("id", session.id);

        sessionsProcessed += 1;
      } catch (err) {
        errors.push(
          `session ${session.id}: ${
            err instanceof Error ? err.message : "failed"
          }`
        );
      }
    }
  }

  return jsonResponse(
    { sessionsProcessed, notificationsSent, errors },
    200,
    headers
  );
}
