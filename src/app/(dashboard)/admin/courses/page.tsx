import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Eye, EyeOff, Plus, Search, Settings, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, sanitizeSearchTerm } from "@/lib/utils";
import { ActionButton } from "../action-button";
import { toggleCoursePublishAction, deleteCourseAction } from "../actions";
import { InstructorCell } from "./instructor-cell";

export const metadata: Metadata = { title: "Admin — Courses" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminCoursesPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("courses")
    .select(
      `*, 
      instructor:profiles!courses_instructor_id_fkey (full_name),
      cohorts (id),
      weeks (id)`
    )
    .order("created_at", { ascending: false });

  const term = sanitizeSearchTerm(q || "");
  if (term) {
    query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  const { data: courses } = await query;

  const { data: instructors } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("role", ["instructor", "teaching_assistant", "admin"])
    .eq("is_active", true)
    .order("full_name");

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          All Courses
        </h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button variant="accent" className="gap-2 shrink-0" asChild>
            <Link href="/manage/courses/new">
              <Plus className="h-4 w-4" />
              New Course
            </Link>
          </Button>
          <form method="get" className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q || ""}
              placeholder="Search courses..."
              className="pl-10 bg-muted/50 border-none"
            />
          </form>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">Course</th>
              <th className="pb-3 font-semibold text-muted-foreground">Instructor</th>
              <th className="pb-3 font-semibold text-muted-foreground">Level</th>
              <th className="pb-3 font-semibold text-muted-foreground text-center">Weeks</th>
              <th className="pb-3 font-semibold text-muted-foreground text-center">Cohorts</th>
              <th className="pb-3 font-semibold text-muted-foreground">Status</th>
              <th className="pb-3 font-semibold text-muted-foreground text-center">Created</th>
              <th className="pb-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {courses?.map((course) => (
              <tr key={course.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{course.slug}</p>
                </td>
                <td className="py-3 pr-4">
                  <InstructorCell
                    courseId={course.id}
                    instructorId={course.instructor_id}
                    instructors={instructors || []}
                  />
                </td>
                <td className="py-3 pr-4">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {course.level || "—"}
                  </Badge>
                </td>
                <td className="py-3 text-center">{course.weeks?.length || 0}</td>
                <td className="py-3 text-center">{course.cohorts?.length || 0}</td>
                <td className="py-3 pr-4">
                  <Badge variant={course.is_published ? "accent" : "outline"} className="gap-1 text-[10px]">
                    {course.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {course.is_published ? "Published" : "Draft"}
                  </Badge>
                </td>
                <td className="py-3 text-center text-xs text-muted-foreground">
                  {formatDate(course.created_at)}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="outline" size="sm" className="gap-1" asChild>
                      <Link href={`/manage/courses/${course.id}`}>
                        <Settings className="h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                    <ActionButton
                      action={toggleCoursePublishAction}
                      fields={{
                        courseId: course.id,
                        isPublished: String(course.is_published),
                      }}
                      variant={course.is_published ? "outline" : "accent"}
                      size="sm"
                      className="gap-1.5"
                      successMessage={
                        course.is_published
                          ? "Course unpublished"
                          : "Course published"
                      }
                    >
                      {course.is_published ? "Unpublish" : "Publish"}
                    </ActionButton>
                    <ActionButton
                      action={deleteCourseAction}
                      fields={{ courseId: course.id }}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      confirmMessage={`Delete "${course.title}"? This removes all weeks, lessons, and cohorts. This cannot be undone.`}
                      successMessage="Course deleted"
                      title="Delete course"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!courses || courses.length === 0) && (
          <div className="py-12 text-center">
            <Eye className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No courses found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
