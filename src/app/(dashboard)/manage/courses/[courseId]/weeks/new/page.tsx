import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeekForm } from "./week-form";

export const metadata: Metadata = { title: "New Week" };

type Props = { params: Promise<{ courseId: string }> };

export default async function NewWeekPage({ params }: Props) {
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
    .select("id, title, instructor_id")
    .eq("id", courseId)
    .maybeSingle();

  if (
    !course ||
    (course.instructor_id !== user.id && profile.role !== "admin")
  ) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Card className="p-8 text-center">
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

  const { data: lastWeek } = await supabase
    .from("weeks")
    .select("week_number")
    .eq("course_id", courseId)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextWeekNumber = (lastWeek?.week_number ?? 0) + 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
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
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">New week</span>
      </div>

      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          New Week
        </h1>
        <p className="text-muted-foreground mt-1">
          Weeks unlock one at a time as the cohort progresses.
        </p>
      </div>

      <WeekForm courseId={courseId} defaultWeekNumber={nextWeekNumber} />
    </div>
  );
}
