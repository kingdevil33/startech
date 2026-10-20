import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  Users,
  Video,
  ClipboardCheck,
  Plus,
  ChevronRight,
  Calendar,
  DollarSign,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Teacher Dashboard" };

export default async function ManageHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !["instructor", "admin", "teaching_assistant"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const isAdmin = profile.role === "admin";

  // Courses
  let courseQuery = supabase
    .from("courses")
    .select(
      "id, title, slug, is_published, cohorts (id, status, seats_filled, capacity, price, currency)"
    )
    .order("created_at", { ascending: false });
  if (!isAdmin) courseQuery = courseQuery.eq("instructor_id", user.id);
  const { data: courses } = await courseQuery;

  const courseIds = courses?.map((c) => c.id) || [];
  const totalCohorts = courses?.reduce(
    (acc, c) => acc + (c.cohorts?.length || 0),
    0
  ) || 0;
  const activeCohorts =
    courses?.flatMap((c) => c.cohorts || []).filter(
      (ch) => ch.status === "active" || ch.status === "enrollment_open"
    ).length || 0;
  const totalStudents =
    courses?.reduce(
      (acc, c) =>
        acc + (c.cohorts || []).reduce((a, ch) => a + (ch.seats_filled || 0), 0),
      0
    ) || 0;

  // Upcoming live sessions across my cohorts
  const { data: cohortIds } = courseIds.length > 0
    ? await supabase
        .from("cohorts")
        .select("id")
        .in("course_id", courseIds)
        .in("status", ["active", "enrollment_open", "enrollment_closed"])
    : { data: [] as { id: string }[] };

  const ids = cohortIds?.map((c) => c.id) || [];
  const nowIso = new Date().toISOString();

  const { data: upcomingSessions } = ids.length > 0
    ? await supabase
        .from("live_sessions")
        .select("id, title, scheduled_at, duration_minutes, platform, cohort:cohorts (name)")
        .in("cohort_id", ids)
        .gte("scheduled_at", nowIso)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(5)
    : { data: [] };

  // Ungraded submissions across my cohorts
  const { count: ungradedCount } = ids.length > 0
    ? await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .in("cohort_id", ids)
        .in("status", ["submitted", "late"])
    : { count: 0 };

  const stats = [
    { label: "Courses", value: courses?.length || 0, icon: BookOpen },
    { label: "Students", value: totalStudents, icon: Users },
    { label: "Active cohorts", value: activeCohorts, icon: Calendar },
    { label: "To grade", value: ungradedCount || 0, icon: ClipboardCheck },
  ];

  const firstName = profile.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Overview of all courses and teaching activity."
              : "Everything you need to run your courses."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/manage/courses/new">
              <Plus className="h-4 w-4" />
              New Course
            </Link>
          </Button>
          <Button variant="accent" className="gap-2" asChild>
            <Link href="/manage/cohorts/new">
              <Plus className="h-4 w-4" />
              New Cohort
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary-600/10 p-2.5">
                <stat.icon className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-xl font-heading font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Courses */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Your courses</h2>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href="/manage/courses">
                View all
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {courses && courses.length > 0 ? (
            <div className="space-y-3">
              {courses.slice(0, 5).map((course) => {
                const cohorts = course.cohorts || [];
                const students = cohorts.reduce(
                  (a, ch) => a + (ch.seats_filled || 0),
                  0
                );
                return (
                  <Link
                    key={course.id}
                    href={`/manage/courses/${course.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{course.title}</p>
                        <Badge
                          variant={course.is_published ? "accent" : "outline"}
                          className="text-[10px] shrink-0"
                        >
                          {course.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cohorts.length} cohorts · {students} students
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No courses yet. Create your first course to get started.
              </p>
              <Button variant="accent" size="sm" className="gap-2" asChild>
                <Link href="/manage/courses/new">
                  <Plus className="h-4 w-4" />
                  Create Course
                </Link>
              </Button>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Upcoming sessions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Upcoming live sessions</h2>
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link href="/dashboard/live">
                  View all
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {upcomingSessions && upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((session) => {
                  const cohort = Array.isArray(session.cohort)
                    ? session.cohort[0]
                    : session.cohort;
                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{session.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.scheduled_at, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {cohort?.name && ` · ${cohort.name}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                        <Video className="h-3 w-3 mr-1" />
                        {session.platform}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No upcoming sessions. Schedule one from a cohort page.
                </p>
              </div>
            )}
          </Card>

          {/* Grading queue */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Grading queue</h2>
              <Button variant="ghost" size="sm" className="gap-1" asChild>
                <Link href="/manage/submissions">
                  Open inbox
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-500/10 p-3">
                <ClipboardCheck className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold">
                  {ungradedCount || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  submissions waiting for a grade
                </p>
              </div>
            </div>
            {(ungradedCount || 0) > 0 && (
              <Button variant="outline" size="sm" className="mt-4 w-full gap-2" asChild>
                <Link href="/manage/submissions">
                  <ClipboardCheck className="h-4 w-4" />
                  Start grading
                </Link>
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* Recent cohorts */}
      {totalCohorts > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Cohorts</h2>
            <Button variant="ghost" size="sm" className="gap-1" asChild>
              <Link href="/manage/cohorts">
                View all
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(courses || [])
              .flatMap((c) =>
                (c.cohorts || []).map((ch) => ({ ...ch, courseTitle: c.title }))
              )
              .slice(0, 6)
              .map((cohort) => (
                <Link
                  key={cohort.id}
                  href={`/manage/cohorts/${cohort.id}`}
                  className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge
                      variant={
                        cohort.status === "enrollment_open"
                          ? "accent"
                          : cohort.status === "active"
                            ? "electric"
                            : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {String(cohort.status).replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCurrency(Number(cohort.price || 0), cohort.currency || "GHS")}
                    </span>
                  </div>
                  <p className="font-medium text-sm truncate mt-1">
                    {cohort.courseTitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cohort.seats_filled || 0}/{cohort.capacity} seats
                  </p>
                </Link>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
