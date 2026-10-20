import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { VideoUploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Upload Video" };

export default async function UploadVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ lessonId?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { lessonId: requestedLessonId } = await searchParams;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Instructors see their own courses; admins see all
  let query = supabase
    .from("courses")
    .select(
      `
      id, title, slug,
      weeks (
        id, title, week_number,
        lessons (id, title, slug, lesson_type)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (profile?.role !== "admin") {
    query = query.eq("instructor_id", user.id);
  }

  const { data: courses } = await query;

  // Build lesson options
  const lessonOptions: {
    lessonId: string;
    lessonTitle: string;
    weekTitle: string;
    courseTitle: string;
  }[] = [];

  courses?.forEach((course) => {
    (course.weeks || [])
      .sort(
        (a: { week_number: number }, b: { week_number: number }) =>
          a.week_number - b.week_number
      )
      .forEach(
        (week: {
          title: string;
          lessons: { id: string; title: string; lesson_type: string }[];
        }) => {
          (week.lessons || [])
            .filter(
              (l: { lesson_type: string }) => l.lesson_type === "video"
            )
            .forEach(
              (lesson: { id: string; title: string }) => {
                lessonOptions.push({
                  lessonId: lesson.id,
                  lessonTitle: lesson.title,
                  weekTitle: week.title,
                  courseTitle: course.title,
                });
              }
            );
        }
      );
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Upload Video
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a video lesson to Mux for streaming.
        </p>
      </div>

      <VideoUploadForm
        lessonOptions={lessonOptions}
        initialLessonId={requestedLessonId}
      />
    </div>
  );
}
