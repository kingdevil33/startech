import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  Video,
  ClipboardCheck,
  Settings,
  UserPlus,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatCurrency, percent } from "@/lib/utils";
import { ActionButton } from "../../../admin/action-button";
import { updateCohortStatusAction } from "./actions";
import { SessionForm } from "./session-form";
import { RosterRow } from "./roster-row";
import { GradingRow } from "./grading-row";
import {
  NEXT_COHORT_STATUS,
  cohortStatusLabel,
  type RosterEntry,
  type SubmissionEntry,
} from "./constants";

export const metadata: Metadata = { title: "Manage Cohort" };

type Props = { params: Promise<{ cohortId: string }> };

function toOne<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value as T[])[0] || null;
  return (value as T) || null;
}

export default async function CohortDetailPage({ params }: Props) {
  const { cohortId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["instructor", "admin", "teaching_assistant"].includes(profile.role)
  ) {
    redirect("/dashboard");
  }

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("*, course:courses(id, title, slug, instructor_id)")
    .eq("id", cohortId)
    .maybeSingle();

  const course = toOne<{
    id: string;
    title: string;
    slug: string;
    instructor_id: string;
  }>(cohort?.course);

  if (
    !cohort ||
    !course ||
    (course.instructor_id !== user.id && profile.role !== "admin")
  ) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold mb-1">
            Cohort not found
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            This cohort does not exist or you do not have access to it.
          </p>
          <Button variant="outline" asChild>
            <Link href="/manage/cohorts">Back to Cohorts</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { data: weeks } = await supabase
    .from("weeks")
    .select("id, title, week_number")
    .eq("course_id", course.id)
    .order("week_number", { ascending: true });

  const { data: rosterRows } = await supabase
    .from("enrollments")
    .select(
      "id, status, created_at, access_expires_at, user:profiles!enrollments_user_id_fkey (id, full_name, email, avatar_url)"
    )
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: true });

  const { data: sessionRows } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("cohort_id", cohortId)
    .order("scheduled_at", { ascending: true });

  const sessions = (sessionRows || []) as {
    id: string;
    title: string;
    description: string | null;
    platform: string;
    status: string;
    scheduled_at: string;
    duration_minutes: number;
    join_url: string | null;
  }[];

  const sessionIds = sessions.map((session) => session.id);

  const { data: attendanceRows } =
    sessionIds.length > 0
      ? await supabase
          .from("live_attendance")
          .select("id, session_id")
          .in("session_id", sessionIds)
      : { data: null };

  const attendanceCount = new Map<string, number>();
  ((attendanceRows || []) as { session_id: string }[]).forEach((row) => {
    attendanceCount.set(
      row.session_id,
      (attendanceCount.get(row.session_id) || 0) + 1
    );
  });

  const { data: submissionRows } = await supabase
    .from("submissions")
    .select(
      "*, assignment:assignments(title), user:profiles!submissions_user_id_fkey(full_name, email)"
    )
    .eq("cohort_id", cohortId)
    .order("submitted_at", { ascending: false });

  const roster = (rosterRows || []) as unknown as RosterEntry[];

  const submissions = (submissionRows || []) as unknown as SubmissionEntry[];

  const activeEnrollments = roster.filter(
    (row) => row.status === "active" || row.status === "completed"
  ).length;
  const fillPercent = percent(Number(cohort.seats_filled), Number(cohort.capacity));
  const nextStatus = NEXT_COHORT_STATUS[cohort.status as string];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/manage/cohorts"
          className="hover:text-foreground transition-colors"
        >
          Cohorts
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">
          {String(cohort.name)}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={cohort.status as BadgeProps["variant"]}
              className="capitalize"
            >
              {cohortStatusLabel(String(cohort.status))}
            </Badge>
            <Link
              href={`/courses/${course.slug}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {course.title}
            </Link>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            {String(cohort.name)}
          </h1>
          {cohort.description && (
            <p className="text-muted-foreground mt-1">
              {String(cohort.description)}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href={`/manage/courses/${course.id}`}>
            <Settings className="h-3.5 w-3.5" />
            Edit course content
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-heading font-bold">
                {String(cohort.seats_filled)}/{String(cohort.capacity)}
              </p>
              <p className="text-xs text-muted-foreground">Seats filled</p>
            </div>
          </div>
          <Progress value={fillPercent} className="h-2 mt-3" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(Number(cohort.price), String(cohort.currency))}
              </p>
              <p className="text-xs text-muted-foreground">Price</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-electric-500/10 p-2.5">
              <Calendar className="h-5 w-5 text-electric-500" />
            </div>
            <div>
              <p className="text-sm font-heading font-bold">
                {formatDate(String(cohort.starts_at))} →{" "}
                {formatDate(String(cohort.ends_at))}
              </p>
              <p className="text-xs text-muted-foreground">
                {String(cohort.timezone)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary-600/20 p-2.5">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {activeEnrollments}
              </p>
              <p className="text-xs text-muted-foreground">Active students</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="roster">
        <TabsList>
          <TabsTrigger value="roster" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Roster
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5">
            <Video className="h-3.5 w-3.5" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-xs text-blue-500 flex items-center gap-2">
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            Students enroll through checkout — there is no manual invite form.
            Use the roster actions to drop or reinstate a student.
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Student
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Joined
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Access expires
                  </th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roster.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {row.user?.avatar_url && (
                            <AvatarImage
                              src={row.user.avatar_url}
                              alt=""
                            />
                          )}
                          <AvatarFallback>
                            {(row.user?.full_name || row.user?.email || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {row.user?.full_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {row.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={
                          row.status === "active"
                            ? "accent"
                            : row.status === "completed"
                              ? "success"
                              : row.status === "dropped" ||
                                  row.status === "refunded"
                                ? "destructive"
                                : "outline"
                        }
                        className="capitalize"
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {row.access_expires_at
                        ? formatDate(row.access_expires_at)
                        : "—"}
                    </td>
                    <td className="py-3">
                      <RosterRow
                        enrollmentId={row.id}
                        initialStatus={row.status}
                        studentName={row.user?.full_name || row.user?.email || "Student"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {roster.length === 0 && (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  No students enrolled yet.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <SessionForm
            cohortId={cohortId}
            weeks={(weeks || []) as { id: string; title: string; week_number: number }[]}
          />

          <div className="space-y-4">
            <h2 className="font-heading text-lg font-semibold">Live sessions</h2>
            {sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 font-semibold text-muted-foreground">
                        Session
                      </th>
                      <th className="pb-3 font-semibold text-muted-foreground">
                        Platform
                      </th>
                      <th className="pb-3 font-semibold text-muted-foreground">
                        When
                      </th>
                      <th className="pb-3 font-semibold text-muted-foreground">
                        Duration
                      </th>
                      <th className="pb-3 font-semibold text-muted-foreground">
                        Status
                      </th>
                      <th className="pb-3 font-semibold text-muted-foreground">
                        Attendance
                      </th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map((session) => (
                      <tr
                        key={session.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium">{session.title}</p>
                          {session.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {session.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="capitalize">
                            {session.platform}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {formatDate(session.scheduled_at)}{" "}
                          {new Date(session.scheduled_at).toLocaleTimeString(
                            [],
                            { hour: "numeric", minute: "2-digit" }
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {session.duration_minutes} min
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={
                              session.status === "completed"
                                ? "success"
                                : session.status === "live"
                                  ? "electric"
                                  : session.status === "cancelled"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="capitalize"
                          >
                            {session.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {attendanceCount.get(session.id) || 0}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {session.join_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a
                                href={session.join_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gap-1.5"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Join
                              </a>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center border border-dashed border-border rounded-xl">
                <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-heading font-semibold mb-1">
                  No live sessions yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Schedule your first session above.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">
              Submissions ({submissions.length})
            </h2>
          </div>

          {submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-semibold text-muted-foreground">
                      Student
                    </th>
                    <th className="pb-3 font-semibold text-muted-foreground">
                      Assignment
                    </th>
                    <th className="pb-3 font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-3 font-semibold text-muted-foreground">
                      Submitted
                    </th>
                    <th className="pb-3 font-semibold text-muted-foreground">
                      Score
                    </th>
                    <th className="pb-3 font-semibold text-muted-foreground">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map((submission) => {
                    const assignment = toOne<{ title: string }>(
                      submission.assignment
                    );
                    const score =
                      submission.instructor_score ?? submission.final_score;
                    return (
                      <GradingRow
                        key={submission.id}
                        submissionId={submission.id}
                        studentName={submission.user?.full_name || "—"}
                        studentEmail={submission.user?.email || ""}
                        assignmentTitle={assignment?.title || "—"}
                        status={submission.status}
                        submittedAtLabel={
                          submission.submitted_at
                            ? formatDate(submission.submitted_at)
                            : "Not submitted"
                        }
                        scoreLabel={score != null ? String(score) : "—"}
                        initialScore={score != null ? String(score) : ""}
                        initialFeedback={submission.instructor_feedback || ""}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center border border-dashed border-border rounded-xl">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-heading font-semibold mb-1">
                No submissions yet
              </p>
              <p className="text-sm text-muted-foreground">
                Student work will show up here once assignments are submitted.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h2 className="font-heading text-lg font-semibold mb-4">
              Cohort facts
            </h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Course</dt>
                <dd className="font-medium">{course.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="font-medium capitalize">
                  {cohortStatusLabel(String(cohort.status))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Enrollment window</dt>
                <dd className="font-medium">
                  {formatDate(String(cohort.enrollment_opens_at))} →{" "}
                  {formatDate(String(cohort.enrollment_closes_at))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Cohort dates</dt>
                <dd className="font-medium">
                  {formatDate(String(cohort.starts_at))} →{" "}
                  {formatDate(String(cohort.ends_at))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Timezone</dt>
                <dd className="font-medium">{String(cohort.timezone)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Capacity</dt>
                <dd className="font-medium">
                  {String(cohort.seats_filled)} / {String(cohort.capacity)}{" "}
                  seats
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium">
                  {formatCurrency(
                    Number(cohort.price),
                    String(cohort.currency)
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Post access</dt>
                <dd className="font-medium">
                  {String(cohort.post_access_days)} days after completion
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Coupon codes</dt>
                <dd className="font-medium">
                  {Array.isArray(cohort.coupon_codes)
                    ? cohort.coupon_codes.length
                    : 0}{" "}
                  defined
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-heading text-lg font-semibold mb-1">
              Status
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Cohorts move forward through a fixed lifecycle.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {nextStatus ? (
                <ActionButton
                  action={updateCohortStatusAction}
                  fields={{ cohortId, status: nextStatus }}
                  variant="accent"
                  size="sm"
                  className="gap-1.5"
                  confirmMessage={`Move this cohort to "${cohortStatusLabel(nextStatus)}"?`}
                  successMessage={`Cohort moved to ${cohortStatusLabel(nextStatus)}`}
                >
                  Move to {cohortStatusLabel(nextStatus)}
                </ActionButton>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This cohort has reached the end of its lifecycle.
                </p>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/cohorts">Open in admin</Link>
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Last updated {formatDate(String(cohort.updated_at))} ·{" "}
          {String(cohort.timezone)}
        </p>
      </div>
    </div>
  );
}
