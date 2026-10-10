import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Trophy,
  TrendingUp,
  ArrowRight,
  Play,
  Calendar,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelativeTime, percent } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch enrollments with cohort and course data
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      `
      *,
      cohort:cohorts (
        *,
        course:courses (
          *,
          weeks (
            id,
            lessons (id)
          )
        )
      )
    `
    )
    .eq("user_id", user.id)
    .in("status", ["active", "completed"])
    .order("created_at", { ascending: false });

  // Fetch progress for all enrollments
  const { data: progress } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_completed", true);

  // Fetch upcoming live sessions
  const { data: liveSessions } = await supabase
    .from("live_sessions")
    .select("*")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(3);

  // Fetch recent notifications
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const completedLessonIds = new Set(progress?.map((p) => p.lesson_id) || []);

  // Calculate overall stats
  const totalLessons = enrollments?.reduce((acc, e) => {
    const weeks = e.cohort?.course?.weeks || [];
    return acc + weeks.reduce((w: number, week: { lessons: unknown[] }) => w + (week.lessons?.length || 0), 0);
  }, 0) || 0;

  const completedLessons = completedLessonIds.size;
  const activeEnrollments = enrollments?.filter((e) => e.status === "active").length || 0;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Welcome Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your learning progress.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={BookOpen}
          label="Active Courses"
          value={activeEnrollments}
          color="text-accent-500"
          bgColor="bg-accent-500/10"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Lessons Completed"
          value={completedLessons}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatsCard
          icon={TrendingUp}
          label="Overall Progress"
          value={`${totalLessons > 0 ? percent(completedLessons, totalLessons) : 0}%`}
          color="text-electric-500"
          bgColor="bg-electric-500/10"
        />
        <StatsCard
          icon={Trophy}
          label="Certificates"
          value={0}
          color="text-amber-500"
          bgColor="bg-amber-500/10"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Courses — takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">My Courses</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/courses">
                Browse Courses <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {enrollments && enrollments.length > 0 ? (
            <div className="space-y-4">
              {enrollments.map((enrollment) => {
                const course = enrollment.cohort?.course;
                const cohort = enrollment.cohort;
                if (!course || !cohort) return null;

                const courseLessons = course.weeks?.reduce(
                  (acc: string[], week: { lessons: { id: string }[] }) =>
                    acc.concat(week.lessons?.map((l: { id: string }) => l.id) || []),
                  [] as string[]
                ) || [];
                const courseCompleted = courseLessons.filter((id: string) =>
                  completedLessonIds.has(id)
                ).length;
                const coursePercent = percent(courseCompleted, courseLessons.length);

                return (
                  <Card
                    key={enrollment.id}
                    className="p-5 card-hover"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Course thumbnail placeholder */}
                      <div className="w-full sm:w-40 h-24 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0 overflow-hidden">
                        <Play className="h-8 w-8 text-primary-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-heading font-semibold text-lg leading-tight">
                              {course.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {cohort.name}
                            </p>
                          </div>
                          <Badge
                            variant={
                              enrollment.status === "completed"
                                ? "default"
                                : "accent"
                            }
                          >
                            {enrollment.status}
                          </Badge>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-muted-foreground">
                              {courseCompleted}/{courseLessons.length} lessons
                            </span>
                            <span className="font-medium">{coursePercent}%</span>
                          </div>
                          <Progress value={coursePercent} className="h-2" />
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Starts {formatDate(cohort.starts_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {course.estimated_duration_weeks} weeks
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-lg mb-1">
                No courses yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse our catalog and enroll in your first cohort.
              </p>
              <Button variant="accent" asChild>
                <Link href="/courses">Browse Courses</Link>
              </Button>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Upcoming Live Sessions */}
          <div>
            <h2 className="font-heading text-lg font-semibold mb-3">
              Upcoming Sessions
            </h2>
            {liveSessions && liveSessions.length > 0 ? (
              <div className="space-y-3">
                {liveSessions.map((session) => (
                  <Card key={session.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-electric-500/10 p-2 shrink-0">
                        <Calendar className="h-4 w-4 text-electric-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-tight truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(session.scheduled_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No upcoming sessions
                </p>
              </Card>
            )}
          </div>

          {/* Recent Notifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg font-semibold">
                Notifications
              </h2>
              {notifications && notifications.length > 0 && (
                <Badge variant="electric">{notifications.length}</Badge>
              )}
            </div>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <Card key={notif.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <Circle className="h-2 w-2 fill-accent-500 text-accent-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(notif.created_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stats card sub-component
function StatsCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl ${bgColor} p-2.5`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-heading font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
