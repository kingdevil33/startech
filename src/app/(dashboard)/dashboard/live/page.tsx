import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  Radio,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Live Sessions" };

const platformVariant: Record<string, "default" | "accent" | "outline"> = {
  zoom: "accent",
  youtube: "default",
  tiktok: "outline",
  custom: "outline",
};

export default async function LiveSessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, cohort_id")
    .eq("user_id", user.id)
    .in("status", ["active", "completed"]);

  const cohortIds = (enrollments ?? []).map((e) => e.cohort_id);

  const [{ data: sessions }, { data: attendance }] = await Promise.all([
    cohortIds.length > 0
      ? supabase
          .from("live_sessions")
          .select(
            "id, title, description, platform, status, scheduled_at, duration_minutes, join_url, recording_url, cohort_id, cohort:cohorts (name, course:courses (title, slug))"
          )
          .in("cohort_id", cohortIds)
          .order("scheduled_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase.from("live_attendance").select("session_id, duration_minutes"),
  ]);

  const attendedSessionIds = new Set(
    (attendance ?? []).map((a) => a.session_id)
  );

  const normalized = (sessions ?? []).map((s) => {
    const raw = s as unknown as {
      id: string;
      title: string;
      description: string | null;
      platform: string;
      status: string;
      scheduled_at: string;
      duration_minutes: number;
      join_url: string | null;
      recording_url: string | null;
      cohort: unknown;
    };
    const cohort = Array.isArray(raw.cohort)
      ? (raw.cohort as unknown as {
          name?: string;
          course?: unknown;
        }[])[0]
      : (raw.cohort as unknown as { name?: string; course?: unknown } | null);
    const course = Array.isArray(cohort?.course)
      ? (cohort?.course as unknown as { title?: string; slug?: string }[])[0]
      : (cohort?.course as unknown as { title?: string; slug?: string } | null);
    return {
      ...raw,
      cohortName: cohort?.name ?? "",
      courseTitle: course?.title ?? "",
      courseSlug: course?.slug ?? "",
    };
  });

  const now = Date.now();
  const upcoming = normalized
    .filter((s) => s.status === "scheduled" && new Date(s.scheduled_at).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  const past = normalized
    .filter(
      (s) =>
        s.status !== "scheduled" || new Date(s.scheduled_at).getTime() <= now
    )
    .sort(
      (a, b) =>
        new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Live Sessions
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time sessions for your cohorts, plus recordings afterwards.
        </p>
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <Card className="p-12 text-center">
          <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-1">
            No live sessions yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Once your cohort schedule is published, sessions will appear here
            with reminders before each one.
          </p>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </Card>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent-500" />
            Upcoming
          </h2>
          <div className="grid gap-4">
            {upcoming.map((session) => (
              <Card key={session.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={platformVariant[session.platform] || "outline"}
                        className="capitalize text-[10px]"
                      >
                        {session.platform}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {session.status}
                      </Badge>
                      {attendedSessionIds.has(session.id) && (
                        <Badge variant="accent" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Attended
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-heading font-semibold">
                      {session.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {session.courseTitle}
                      {session.cohortName ? ` · ${session.cohortName}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateTime(session.scheduled_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {session.duration_minutes} min
                      </span>
                    </div>
                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {session.join_url && (
                      <Button asChild>
                        <a href={session.join_url} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4" />
                          Join
                        </a>
                      </Button>
                    )}
                    {session.courseSlug && (
                      <Button variant="outline" asChild>
                        <Link href={`/dashboard/courses/${session.courseSlug}`}>
                          Course
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Past sessions
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-semibold text-muted-foreground">Session</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Cohort</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Date</th>
                  <th className="pb-3 font-semibold text-muted-foreground">Status</th>
                  <th className="pb-3 font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {past.map((session) => (
                  <tr key={session.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {session.platform} · {session.duration_minutes} min
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {session.cohortName || "—"}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {formatDate(session.scheduled_at)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={session.status === "completed" ? "accent" : "outline"}
                        className="capitalize text-[10px]"
                      >
                        {session.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {(session.recording_url || session.join_url) && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={session.recording_url || session.join_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {session.recording_url ? "Recording" : "Link"}
                          </a>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
