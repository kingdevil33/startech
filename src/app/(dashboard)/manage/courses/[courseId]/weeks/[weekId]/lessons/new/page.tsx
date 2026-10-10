import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LessonForm } from "../../lesson-form";

export const metadata: Metadata = { title: "New Lesson" };

type Props = { params: Promise<{ courseId: string; weekId: string }> };

export default async function NewLessonPage({ params }: Props) {
  const { courseId, weekId } = await params;
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

  const { data: week } = await supabase
    .from("weeks")
    .select("id, title, week_number, course_id, course:courses(id, title, instructor_id)")
    .eq("id", weekId)
    .maybeSingle();

  const course = Array.isArray(week?.course)
    ? (week.course as Record<string, unknown>[])[0]
    : (week?.course as Record<string, unknown> | null | undefined);

  if (
    !week ||
    !course ||
    week.course_id !== courseId ||
    (course.instructor_id !== user.id && profile.role !== "admin")
  ) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Card className="p-8 text-center">
          <h1 className="font-heading text-xl font-bold mb-1">Week not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This week does not exist or you do not have access to it.
          </p>
          <Button variant="outline" asChild>
            <Link href="/manage/courses">Back to My Courses</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/manage/courses"
          className="hover:text-foreground transition-colors"
        >
          My Courses
        </Link>
        <span>/</span>
        <Link
          href={`/manage/courses/${courseId}`}
          className="hover:text-foreground transition-colors"
        >
          {String(course.title)}
        </Link>
        <span>/</span>
        <Link
          href={`/manage/courses/${courseId}/weeks/${weekId}`}
          className="hover:text-foreground transition-colors"
        >
          Week {String(week.week_number)}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New lesson</span>
      </div>

      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          New Lesson
        </h1>
        <p className="text-muted-foreground mt-1">
          Adding a lesson to “{String(week.title)}”.
        </p>
      </div>

      <LessonForm mode="create" weekId={weekId} courseId={courseId} />
    </div>
  );
}
