import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  Plus,
  Eye,
  Settings,
  Users,
  ClipboardCheck,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton } from "../../../admin/action-button";
import { toggleCoursePublishAction } from "../../../admin/actions";
import { CourseForm } from "./course-form";

export const metadata: Metadata = { title: "Course Editor" };

type Props = { params: Promise<{ courseId: string }> };

export default async function CourseEditorPage({ params }: Props) {
  const { courseId } = await params;
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

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (
    !course ||
    (course.instructor_id !== user.id && profile.role !== "admin")
  ) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold mb-1">
            Course not found
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            This course does not exist or you do not have access to it.
          </p>
          <Button variant="outline" asChild>
            <Link href="/manage/courses">Back to My Courses</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { data: weeks } = await supabase
    .from("weeks")
    .select("id, title, week_number, is_published, lessons(id), assignments(id)")
    .eq("course_id", courseId)
    .order("week_number", { ascending: true });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/manage/courses"
          className="hover:text-foreground transition-colors"
        >
          My Courses
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">
          {course.title}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={course.is_published ? "accent" : "outline"}>
              {course.is_published ? "Published" : "Draft"}
            </Badge>
            {course.level && (
              <Badge variant="outline" className="capitalize">
                {course.level}
              </Badge>
            )}
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            {course.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            Edit course details, certificate rules, and weekly content.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            action={toggleCoursePublishAction}
            fields={{ courseId, isPublished: String(course.is_published) }}
            variant={course.is_published ? "outline" : "accent"}
            size="sm"
            className="gap-1.5"
            successMessage={
              course.is_published ? "Course unpublished" : "Course published"
            }
          >
            <Upload className="h-3.5 w-3.5" />
            {course.is_published ? "Unpublish" : "Publish"}
          </ActionButton>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/courses/${course.slug}`}>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Link>
          </Button>
          <Button variant="accent" size="sm" className="gap-1.5" asChild>
            <Link href={`/manage/courses/${courseId}/weeks/new`}>
              <Plus className="h-3.5 w-3.5" />
              New week
            </Link>
          </Button>
        </div>
      </div>

      <CourseForm course={course} />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Weeks</h2>
            <p className="text-sm text-muted-foreground">
              Content drips week by week as the cohort progresses.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/manage/courses/${courseId}/weeks/new`}>
              <Plus className="h-3.5 w-3.5" />
              New week
            </Link>
          </Button>
        </div>

        {weeks && weeks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-semibold text-muted-foreground w-16">
                    #
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Title
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Lessons
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Assignments
                  </th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {weeks.map((week: Record<string, unknown>) => (
                  <tr
                    key={String(week.id)}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-4 font-heading font-bold text-muted-foreground">
                      {String(week.week_number)}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      {String(week.title)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={week.is_published ? "accent" : "outline"}
                        className="text-[10px]"
                      >
                        {week.is_published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {Array.isArray(week.lessons)
                          ? week.lessons.length
                          : 0}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        {Array.isArray(week.assignments)
                          ? week.assignments.length
                          : 0}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                        <Link
                          href={`/manage/courses/${courseId}/weeks/${week.id}`}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Manage
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center border border-dashed border-border rounded-xl">
            <Plus className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-heading font-semibold mb-1">No weeks yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create the first week to start adding lessons and assignments.
            </p>
            <Button variant="accent" size="sm" className="gap-1.5" asChild>
              <Link href={`/manage/courses/${courseId}/weeks/new`}>
                <Plus className="h-3.5 w-3.5" />
                Create first week
              </Link>
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            Students see this course on the public catalog once published, and
            enrolled cohorts unlock week{" "}
            <span className="font-medium text-foreground">n</span> exactly{" "}
            <span className="font-medium text-foreground">n-1</span> weeks
            after their cohort start date.
          </p>
        </div>
      </Card>
    </div>
  );
}
