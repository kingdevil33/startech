import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  Plus,
  Settings,
  Users,
  Eye,
  MoreHorizontal,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage Courses" };

export default async function ManageCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify instructor role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["instructor", "admin", "teaching_assistant"].includes(profile.role)) {
    redirect("/dashboard");
  }

  // Fetch courses where user is instructor
  const { data: courses } = await supabase
    .from("courses")
    .select(
      `
      *,
      cohorts (id, name, status, seats_filled, capacity, starts_at),
      weeks (id)
    `
    )
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            My Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your courses, content, and cohorts.
          </p>
        </div>
        <Button variant="accent" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Course
        </Button>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid gap-4">
          {courses.map((course) => {
            const totalCohorts = course.cohorts?.length || 0;
            const activeCohorts =
              course.cohorts?.filter(
                (c: { status: string }) =>
                  c.status === "active" || c.status === "enrollment_open"
              ).length || 0;
            const totalStudents =
              course.cohorts?.reduce(
                (acc: number, c: { seats_filled: number }) =>
                  acc + c.seats_filled,
                0
              ) || 0;
            const totalWeeks = course.weeks?.length || 0;

            return (
              <Card key={course.id} className="p-5 card-hover">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Thumbnail */}
                  <div className="w-full sm:w-48 h-28 rounded-lg bg-primary-600/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-8 w-8 text-primary-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={course.is_published ? "accent" : "outline"}
                          >
                            {course.is_published ? "Published" : "Draft"}
                          </Badge>
                          {course.level && (
                            <Badge variant="outline" className="capitalize">
                              {course.level}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-heading font-semibold text-lg">
                          {course.title}
                        </h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {course.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {totalStudents} students
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {totalCohorts} cohorts ({activeCohorts} active)
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />
                        {totalWeeks} weeks
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <Link href={`/courses/${course.slug}`}>
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Settings className="h-3.5 w-3.5" />
                        Edit
                      </Button>
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
            Create your first course to get started.
          </p>
          <Button variant="accent" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Course
          </Button>
        </Card>
      )}
    </div>
  );
}
