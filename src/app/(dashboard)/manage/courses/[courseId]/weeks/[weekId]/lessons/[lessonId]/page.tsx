import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, FileText, Upload, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonForm, DeleteLessonButton } from "../../lesson-form";

export const metadata: Metadata = { title: "Edit Lesson" };

type Props = {
  params: Promise<{ courseId: string; weekId: string; lessonId: string }>;
};

type MuxAsset = {
  id: string;
  status: string;
  duration_seconds: number | null;
  transcript: string | null;
  error_message: string | null;
  mux_playback_id: string | null;
};

function statusVariant(status: string) {
  if (status === "ready") return "accent" as const;
  if (status === "errored") return "destructive" as const;
  return "outline" as const;
}

function statusLabel(status: string) {
  if (status === "ready") return "Ready";
  if (status === "preparing") return "Preparing";
  if (status === "errored") return "Errored";
  return "Waiting";
}

export default async function LessonEditorPage({ params }: Props) {
  const { courseId, weekId, lessonId } = await params;
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

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "*, week:weeks(id, title, week_number, course_id, course:courses(id, title, instructor_id))"
    )
    .eq("id", lessonId)
    .maybeSingle();

  const week = Array.isArray(lesson?.week)
    ? (lesson.week as Record<string, unknown>[])[0]
    : (lesson?.week as Record<string, unknown> | null | undefined);

  const course = Array.isArray(week?.course)
    ? (week?.course as Record<string, unknown>[])[0]
    : (week?.course as Record<string, unknown> | null | undefined);

  if (
    !lesson ||
    !week ||
    !course ||
    week.course_id !== courseId ||
    lesson.week_id !== weekId ||
    (course.instructor_id !== user.id && profile.role !== "admin")
  ) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold mb-1">
            Lesson not found
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            This lesson does not exist or you do not have access to it.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/manage/courses/${courseId}`}>Back to course</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { data: muxRows } = await supabase
    .from("mux_assets")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: false });

  const assets = (muxRows || []) as unknown as MuxAsset[];

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
        <span className="text-foreground font-medium truncate">
          {String(lesson.title)}
        </span>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={lesson.is_published ? "accent" : "outline"}>
            {lesson.is_published ? "Published" : "Draft"}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {String(lesson.lesson_type)}
          </Badge>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Edit Lesson
        </h1>
      </div>

      <LessonForm
        mode="edit"
        weekId={weekId}
        courseId={courseId}
        lesson={{
          id: String(lesson.id),
          title: String(lesson.title),
          slug: String(lesson.slug),
          lesson_type: String(lesson.lesson_type),
          description: lesson.description ? String(lesson.description) : null,
          content: lesson.content ? String(lesson.content) : null,
          sort_order: Number(lesson.sort_order),
          duration_minutes:
            lesson.duration_minutes != null
              ? Number(lesson.duration_minutes)
              : null,
          is_published: Boolean(lesson.is_published),
          is_free_preview: Boolean(lesson.is_free_preview),
          resources: Array.isArray(lesson.resources)
            ? (lesson.resources as unknown as {
                title: string;
                url: string;
                type: string;
              }[])
            : [],
        }}
      />

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
              <Video className="h-4 w-4 text-accent-500" />
              Video
            </h2>
            <p className="text-sm text-muted-foreground">
              Mux assets linked to this lesson.
            </p>
          </div>
          {String(lesson.lesson_type) === "video" && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={`/manage/upload?lessonId=${lessonId}`}>
                <Upload className="h-3.5 w-3.5" />
                Upload video
              </Link>
            </Button>
          )}
        </div>

        {assets.length > 0 ? (
          <div className="space-y-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-lg border border-border p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(asset.status)}>
                    {statusLabel(asset.status)}
                  </Badge>
                  {asset.duration_seconds != null && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(Number(asset.duration_seconds))}s
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Transcript:{" "}
                    {asset.transcript && asset.transcript.trim()
                      ? "yes"
                      : "no"}
                  </span>
                  {asset.mux_playback_id && (
                    <span className="text-xs text-muted-foreground truncate">
                      {asset.mux_playback_id}
                    </span>
                  )}
                </div>
                {asset.error_message && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive">
                      {asset.error_message}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center border border-dashed border-border rounded-lg">
            <Video className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No video uploaded for this lesson yet.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6 border-destructive/30">
        <h2 className="font-heading text-lg font-semibold text-destructive mb-1">
          Danger zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting a lesson removes its content, video assets, and student
          progress permanently.
        </p>
        <DeleteLessonButton
          lessonId={lessonId}
          weekPath={`/manage/courses/${courseId}/weeks/${weekId}`}
        />
      </Card>
    </div>
  );
}
