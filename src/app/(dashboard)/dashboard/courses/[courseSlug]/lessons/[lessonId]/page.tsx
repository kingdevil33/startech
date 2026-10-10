import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Play,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LessonVideoPlayer } from "./video-player";
import { MarkCompleteButton } from "./mark-complete-button";

type Props = {
  params: Promise<{ courseSlug: string; lessonId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lessonId } = await params;
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("title")
    .eq("id", lessonId)
    .single();

  return { title: lesson?.title || "Lesson" };
}

export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the course
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, slug")
    .eq("slug", courseSlug)
    .single();

  if (!course) notFound();

  // Fetch the lesson with Mux asset
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      `
      *,
      mux_assets (id, mux_playback_id, status, duration_seconds, transcript),
      week:weeks (id, title, week_number, course_id)
    `
    )
    .eq("id", lessonId)
    .single();

  if (!lesson || !lesson.week) notFound();

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("*, cohort:cohorts (*)")
    .eq("user_id", user.id)
    .in("status", ["active", "completed"])
    .eq("cohort.course_id", course.id)
    .not("cohort", "is", null)
    .limit(1)
    .single();

  if (!enrollment) {
    redirect(`/courses/${courseSlug}`);
  }

  // Check if week is unlocked
  const cohortStart = new Date(enrollment.cohort.starts_at);
  const weekUnlockDate = new Date(cohortStart);
  weekUnlockDate.setDate(
    weekUnlockDate.getDate() + (lesson.week.week_number - 1) * 7
  );
  if (new Date() < weekUnlockDate) {
    redirect(`/dashboard/courses/${courseSlug}`);
  }

  // Fetch progress for this lesson
  const { data: progress } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("enrollment_id", enrollment.id)
    .eq("lesson_id", lessonId)
    .single();

  const isCompleted = progress?.is_completed || false;

  // Fetch all lessons in the course for navigation
  const { data: allWeeks } = await supabase
    .from("weeks")
    .select(
      `
      id, title, week_number, is_published,
      lessons (id, title, slug, sort_order, is_published)
    `
    )
    .eq("course_id", course.id)
    .eq("is_published", true)
    .order("week_number", { ascending: true });

  // Build a flat ordered list of lessons
  const allLessons =
    allWeeks
      ?.sort((a, b) => a.week_number - b.week_number)
      .flatMap((w) =>
        (w.lessons || [])
          .filter((l: { is_published: boolean }) => l.is_published)
          .sort(
            (a: { sort_order: number }, b: { sort_order: number }) =>
              a.sort_order - b.sort_order
          )
          .map((l: { id: string; title: string; slug: string }) => ({
            ...l,
            weekTitle: w.title,
            weekNumber: w.week_number,
          }))
      ) || [];

  const currentIndex = allLessons.findIndex(
    (l: { id: string }) => l.id === lessonId
  );
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const muxAsset = lesson.mux_assets?.[0] || lesson.mux_assets;
  const resources = lesson.resources || [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/courses/${courseSlug}`}
          className="hover:text-foreground transition-colors"
        >
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">
          {lesson.title}
        </span>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Main content — 3 cols */}
        <div className="lg:col-span-3 space-y-6">
          {/* Lesson header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">
                Week {lesson.week.week_number}
              </Badge>
              <Badge variant="outline" className="capitalize gap-1">
                {lesson.lesson_type === "video" && (
                  <Play className="h-3 w-3" />
                )}
                {lesson.lesson_type === "text" && (
                  <FileText className="h-3 w-3" />
                )}
                {lesson.lesson_type}
              </Badge>
              {isCompleted && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </Badge>
              )}
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              {lesson.title}
            </h1>
            {lesson.description && (
              <p className="text-muted-foreground mt-2">{lesson.description}</p>
            )}
          </div>

          {/* Video player */}
          {lesson.lesson_type === "video" && muxAsset?.mux_playback_id && (
            <LessonVideoPlayer
              playbackId={muxAsset.mux_playback_id}
              lessonId={lessonId}
              enrollmentId={enrollment.id}
              lastPosition={progress?.last_position_seconds || 0}
            />
          )}

          {/* Text content */}
          {lesson.content && (
            <Card className="p-6 sm:p-8">
              <div
                className="prose prose-sm dark:prose-invert max-w-none 
                  prose-headings:font-heading prose-headings:font-bold
                  prose-a:text-accent-500 prose-a:no-underline hover:prose-a:underline
                  prose-code:font-mono prose-code:text-sm
                  prose-pre:bg-muted prose-pre:border prose-pre:border-border"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
              />
            </Card>
          )}

          {/* Resources */}
          {resources.length > 0 && (
            <Card className="p-5">
              <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                Resources
              </h3>
              <div className="space-y-2">
                {resources.map(
                  (
                    resource: { title: string; url: string; type: string },
                    i: number
                  ) => (
                    <a
                      key={i}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">
                        {resource.title}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {resource.type}
                      </Badge>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )
                )}
              </div>
            </Card>
          )}

          {/* Mark complete + navigation */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <MarkCompleteButton
              lessonId={lessonId}
              enrollmentId={enrollment.id}
              isCompleted={isCompleted}
            />
          </div>

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between gap-4">
            {prevLesson ? (
              <Button variant="outline" asChild className="gap-2">
                <Link
                  href={`/dashboard/courses/${courseSlug}/lessons/${prevLesson.id}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{prevLesson.title}</span>
                  <span className="sm:hidden">Previous</span>
                </Link>
              </Button>
            ) : (
              <div />
            )}
            {nextLesson ? (
              <Button variant="accent" asChild className="gap-2">
                <Link
                  href={`/dashboard/courses/${courseSlug}/lessons/${nextLesson.id}`}
                >
                  <span className="hidden sm:inline">{nextLesson.title}</span>
                  <span className="sm:hidden">Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="accent" asChild className="gap-2">
                <Link href={`/dashboard/courses/${courseSlug}`}>
                  Back to Syllabus
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Right sidebar — 1 col */}
        <div className="space-y-4">
          {/* Lesson list */}
          <Card className="p-4">
            <h3 className="font-heading font-semibold text-sm mb-3">
              Course Lessons
            </h3>
            <div className="space-y-0.5 max-h-[60vh] overflow-y-auto">
              {allLessons.map(
                (
                  l: {
                    id: string;
                    title: string;
                    weekTitle: string;
                    weekNumber: number;
                  },
                  idx: number
                ) => {
                  const isCurrent = l.id === lessonId;
                  // Show week divider
                  const showWeekDivider =
                    idx === 0 ||
                    l.weekNumber !== allLessons[idx - 1]?.weekNumber;

                  return (
                    <div key={l.id}>
                      {showWeekDivider && (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pt-3 pb-1">
                          Week {l.weekNumber}
                        </p>
                      )}
                      <Link
                        href={`/dashboard/courses/${courseSlug}/lessons/${l.id}`}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${
                          isCurrent
                            ? "bg-accent-500/10 text-accent-600 font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <span className="truncate">{l.title}</span>
                      </Link>
                    </div>
                  );
                }
              )}
            </div>
          </Card>

          {/* Lesson info */}
          <Card className="p-4 space-y-3">
            <h3 className="font-heading font-semibold text-sm">
              Lesson Details
            </h3>
            <div className="space-y-2 text-sm">
              {lesson.duration_minutes && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{lesson.duration_minutes} min</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                <span>
                  Week {lesson.week.week_number}: {lesson.week.title}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
