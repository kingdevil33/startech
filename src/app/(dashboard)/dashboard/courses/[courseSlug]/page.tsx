import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  Play,
  FileText,
  ClipboardCheck,
  Calendar,
  ArrowLeft,
  Video,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatRelativeTime, percent } from "@/lib/utils";

type Props = {
  params: Promise<{ courseSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("title")
    .eq("slug", courseSlug)
    .single();

  return {
    title: course?.title || "Course",
  };
}

export default async function CourseProgressPage({ params }: Props) {
  const { courseSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch course with weeks and lessons
  const { data: course } = await supabase
    .from("courses")
    .select(
      `
      *,
      instructor:profiles!courses_instructor_id_fkey (id, full_name, avatar_url),
      weeks (
        *,
        lessons (
          id, title, slug, description, lesson_type, sort_order, 
          duration_minutes, is_published, is_free_preview,
          mux_assets (mux_playback_id, status, duration_seconds)
        ),
        assignments (
          id, title, description, due_date_offset_days, is_published, is_required
        )
      )
    `
    )
    .eq("slug", courseSlug)
    .single();

  if (!course) notFound();

  // Find active enrollment for this course
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select(
      `
      *,
      cohort:cohorts (*)
    `
    )
    .eq("user_id", user.id)
    .in("status", ["active", "completed"])
    .eq("cohort.course_id", course.id)
    .not("cohort", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!enrollment?.cohort) {
    redirect(`/courses/${courseSlug}`);
  }

  const cohort = enrollment.cohort;

  // Fetch progress
  const { data: progressData } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("enrollment_id", enrollment.id);

  const completedLessonIds = new Set(
    progressData?.filter((p) => p.is_completed).map((p) => p.lesson_id) || []
  );

  // Fetch submissions for this enrollment
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", user.id)
    .eq("enrollment_id", enrollment.id);

  const submissionsByAssignment = new Map(
    submissions?.map((s) => [s.assignment_id, s]) || []
  );

  // Fetch upcoming live sessions for the cohort
  const { data: liveSessions } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("cohort_id", cohort.id)
    .order("scheduled_at", { ascending: true });

  // Sort weeks by week_number
  const weeks = (course.weeks || [])
    .filter((w: { is_published: boolean }) => w.is_published)
    .sort((a: { week_number: number }, b: { week_number: number }) => a.week_number - b.week_number);

  // Calculate week unlock status
  const now = new Date();
  const cohortStart = new Date(cohort.starts_at);

  function isWeekUnlocked(weekNumber: number): boolean {
    const unlockDate = new Date(cohortStart);
    unlockDate.setDate(unlockDate.getDate() + (weekNumber - 1) * 7);
    return now >= unlockDate;
  }

  function getWeekUnlockDate(weekNumber: number): Date {
    const unlockDate = new Date(cohortStart);
    unlockDate.setDate(unlockDate.getDate() + (weekNumber - 1) * 7);
    return unlockDate;
  }

  // Calculate overall stats
  const allLessons = weeks.flatMap(
    (w: { lessons: { id: string }[] }) => w.lessons || []
  );
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l: { id: string }) =>
    completedLessonIds.has(l.id)
  ).length;
  const overallPercent = percent(completedCount, totalLessons);

  const totalAssignments = weeks.reduce(
    (acc: number, w: { assignments: unknown[] }) =>
      acc + (w.assignments?.length || 0),
    0
  );
  const submittedAssignments = submissions?.filter(
    (s) => s.status === "submitted" || s.status === "graded"
  ).length || 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Course header */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="accent">{cohort.name}</Badge>
            <Badge variant="outline" className="capitalize">
              {enrollment.status}
            </Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            {course.title}
          </h1>
          {course.instructor && (
            <p className="text-muted-foreground mt-1">
              by {course.instructor.full_name}
            </p>
          )}
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {completedCount}/{totalLessons}
              </p>
              <p className="text-xs text-muted-foreground">Lessons</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-electric-500/10 p-2.5">
              <ClipboardCheck className="h-5 w-5 text-electric-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {submittedAssignments}/{totalAssignments}
              </p>
              <p className="text-xs text-muted-foreground">Assignments</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {liveSessions?.filter(
                  (s) => new Date(s.scheduled_at) > now
                ).length || 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Upcoming Sessions
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <Award className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {overallPercent}%
              </p>
              <p className="text-xs text-muted-foreground">Progress</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overall progress bar */}
      <Card className="p-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {completedCount} of {totalLessons} lessons completed
          </span>
        </div>
        <Progress value={overallPercent} className="h-3" />
      </Card>

      {/* Week-by-week syllabus */}
      <div className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Course Syllabus</h2>

        {weeks.map(
          (week: {
            id: string;
            title: string;
            description: string | null;
            week_number: number;
            lessons: {
              id: string;
              title: string;
              slug: string;
              lesson_type: string;
              sort_order: number;
              duration_minutes: number | null;
              is_published: boolean;
              mux_assets: { mux_playback_id: string; status: string; duration_seconds: number }[];
            }[];
            assignments: {
              id: string;
              title: string;
              due_date_offset_days: number;
              is_published: boolean;
              is_required: boolean;
            }[];
          }) => {
            const unlocked = isWeekUnlocked(week.week_number);
            const unlockDate = getWeekUnlockDate(week.week_number);
            const lessons = (week.lessons || [])
              .filter((l) => l.is_published)
              .sort((a, b) => a.sort_order - b.sort_order);
            const assignments = (week.assignments || []).filter(
              (a) => a.is_published
            );
            const weekCompleted = lessons.filter((l) =>
              completedLessonIds.has(l.id)
            ).length;
            const weekPercent = percent(weekCompleted, lessons.length);

            // Get live sessions for this week
            const weekSessions =
              liveSessions?.filter((s) => s.week_id === week.id) || [];

            return (
              <Card key={week.id} className="overflow-hidden">
                {/* Week header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`rounded-xl p-3 shrink-0 ${
                        !unlocked
                          ? "bg-muted"
                          : weekPercent === 100
                            ? "bg-accent-500/10"
                            : "bg-primary-600/10"
                      }`}
                    >
                      {!unlocked ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : weekPercent === 100 ? (
                        <CheckCircle2 className="h-5 w-5 text-accent-500" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-primary-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading font-semibold text-lg">
                        Week {week.week_number}: {week.title}
                      </h3>
                      {week.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {week.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {unlocked ? (
                      <>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {weekCompleted}/{lessons.length}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            lessons
                          </p>
                        </div>
                        <div className="w-24">
                          <Progress value={weekPercent} className="h-2" />
                        </div>
                      </>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Unlocks {formatDate(unlockDate.toISOString())}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Week content - only show if unlocked */}
                {unlocked && (
                  <>
                    <Separator />
                    <div className="p-5 space-y-1.5">
                      {/* Lessons */}
                      {lessons.map((lesson) => {
                        const isCompleted = completedLessonIds.has(lesson.id);
                        const lessonIcon =
                          lesson.lesson_type === "video" ? (
                            <Play className="h-4 w-4" />
                          ) : lesson.lesson_type === "text" ? (
                            <FileText className="h-4 w-4" />
                          ) : (
                            <BookOpen className="h-4 w-4" />
                          );

                        return (
                          <Link
                            key={lesson.id}
                            href={`/dashboard/courses/${courseSlug}/lessons/${lesson.id}`}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                          >
                            <div
                              className={`shrink-0 ${
                                isCompleted
                                  ? "text-accent-500"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </div>
                            <div
                              className={`shrink-0 rounded-lg p-1.5 ${
                                isCompleted
                                  ? "bg-accent-500/10 text-accent-500"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {lessonIcon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  isCompleted
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                                } group-hover:text-foreground`}
                              >
                                {lesson.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                              {lesson.duration_minutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration_minutes}m
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize"
                              >
                                {lesson.lesson_type}
                              </Badge>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </Link>
                        );
                      })}

                      {/* Assignments */}
                      {assignments.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          {assignments.map((assignment) => {
                            const submission = submissionsByAssignment.get(
                              assignment.id
                            );
                            const isSubmitted =
                              submission?.status === "submitted" ||
                              submission?.status === "graded";

                            // Calculate due date
                            const weekUnlock = getWeekUnlockDate(
                              week.week_number
                            );
                            const dueDate = new Date(weekUnlock);
                            dueDate.setDate(
                              dueDate.getDate() +
                                assignment.due_date_offset_days
                            );
                            const isOverdue =
                              !isSubmitted && now > dueDate;

                            return (
                              <Link
                                key={assignment.id}
                                href={`/dashboard/courses/${courseSlug}/assignments/${assignment.id}`}
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                              >
                                <div
                                  className={`shrink-0 ${
                                    isSubmitted
                                      ? "text-accent-500"
                                      : isOverdue
                                        ? "text-destructive"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {isSubmitted ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                  ) : (
                                    <Circle className="h-5 w-5" />
                                  )}
                                </div>
                                <div
                                  className={`shrink-0 rounded-lg p-1.5 ${
                                    isSubmitted
                                      ? "bg-accent-500/10 text-accent-500"
                                      : isOverdue
                                        ? "bg-destructive/10 text-destructive"
                                        : "bg-electric-500/10 text-electric-500"
                                  }`}
                                >
                                  <ClipboardCheck className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {assignment.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Due {formatDate(dueDate.toISOString())}
                                    {isOverdue && !isSubmitted && (
                                      <span className="text-destructive ml-1">
                                        • Overdue
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="shrink-0">
                                  {isSubmitted ? (
                                    <Badge variant="default" className="text-[10px]">
                                      {submission?.status === "graded"
                                        ? `Graded: ${submission?.final_score}`
                                        : "Submitted"}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant={isOverdue ? "destructive" : "outline"}
                                      className="text-[10px]"
                                    >
                                      {assignment.is_required
                                        ? "Required"
                                        : "Optional"}
                                    </Badge>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </Link>
                            );
                          })}
                        </>
                      )}

                      {/* Live sessions for this week */}
                      {weekSessions.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          {weekSessions.map((session) => {
                            const sessionDate = new Date(session.scheduled_at);
                            const isPast = sessionDate < now;
                            const isLive = session.status === "live";

                            return (
                              <div
                                key={session.id}
                                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                              >
                                <div className="shrink-0 text-muted-foreground">
                                  {isPast ? (
                                    <CheckCircle2 className="h-5 w-5 text-accent-500" />
                                  ) : (
                                    <Circle className="h-5 w-5" />
                                  )}
                                </div>
                                <div className="shrink-0 rounded-lg p-1.5 bg-blue-500/10">
                                  <Video className="h-4 w-4 text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {session.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(session.scheduled_at, {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}{" "}
                                    • {session.duration_minutes}min
                                  </p>
                                </div>
                                {isLive && session.join_url && (
                                  <Button
                                    variant="accent"
                                    size="sm"
                                    className="gap-1"
                                    asChild
                                  >
                                    <a
                                      href={session.join_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Join Live
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                                {isPast && session.recording_url && (
                                  <Badge variant="outline" className="gap-1 text-[10px]">
                                    <Play className="h-3 w-3" />
                                    Recording
                                  </Badge>
                                )}
                                {!isPast && !isLive && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatRelativeTime(session.scheduled_at)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </>
                )}
              </Card>
            );
          }
        )}
      </div>
    </div>
  );
}
