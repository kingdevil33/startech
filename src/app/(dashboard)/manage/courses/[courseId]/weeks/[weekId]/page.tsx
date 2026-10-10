import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  BookOpen,
  Plus,
  ClipboardCheck,
  CalendarClock,
  Upload,
  FileText,
  HelpCircle,
  Package,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publishWeekAction } from "../../../actions";
import { ActionButton } from "../../../../../admin/action-button";

export const metadata: Metadata = { title: "Manage Week" };

type Props = { params: Promise<{ courseId: string; weekId: string }> };

function lessonTypeIcon(type: string) {
  if (type === "video") return Video;
  if (type === "text") return FileText;
  if (type === "quiz") return HelpCircle;
  if (type === "resource") return Package;
  return FileText;
}

export default async function WeekDetailPage({ params }: Props) {
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
    .select("*, course:courses(id, title, slug, instructor_id)")
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
          <CalendarClock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold mb-1">Week not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This week does not exist or you do not have access to it.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/manage/courses/${courseId}`}>Back to course</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .eq("week_id", weekId)
    .order("sort_order", { ascending: true });

  const { data: assignments } = await supabase
    .from("assignments")
    .select("*")
    .eq("week_id", weekId)
    .order("created_at", { ascending: true });

  const lessonIds = (lessons || []).map(
    (lesson: Record<string, unknown>) => String(lesson.id)
  );

  const { data: muxRows } =
    lessonIds.length > 0
      ? await supabase
          .from("mux_assets")
          .select("lesson_id, status, duration_seconds, transcript, error_message")
          .in("lesson_id", lessonIds)
      : { data: null };

  const assetByLesson = new Map<
    string,
    {
      status: string;
      duration_seconds: number | null;
      transcript: string | null;
      error_message: string | null;
    }
  >();
  (muxRows || []).forEach(
    (row: {
      lesson_id: string;
      status: string;
      duration_seconds: number | null;
      transcript: string | null;
      error_message: string | null;
    }) => {
      if (!assetByLesson.has(row.lesson_id)) assetByLesson.set(row.lesson_id, row);
    }
  );

  function videoStatusLabel(asset?: { status: string }) {
    if (!asset) return "None";
    if (asset.status === "ready") return "Ready";
    if (asset.status === "errored") return "Errored";
    if (asset.status === "preparing") return "Preparing";
    return "Waiting";
  }

  function videoStatusVariant(asset?: { status: string }) {
    if (asset?.status === "ready") return "accent" as const;
    if (asset?.status === "errored") return "destructive" as const;
    return "outline" as const;
  }

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
        <Link
          href={`/manage/courses/${courseId}`}
          className="hover:text-foreground transition-colors"
        >
          {String(course.title)}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">
          Week {String(week.week_number)}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={week.is_published ? "accent" : "outline"}>
              {week.is_published ? "Published" : "Draft"}
            </Badge>
            <Badge variant="outline">Week {String(week.week_number)}</Badge>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            {String(week.title)}
          </h1>
          {week.description && (
            <p className="text-muted-foreground mt-1">{String(week.description)}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            action={publishWeekAction}
            fields={{ weekId, isPublished: String(week.is_published) }}
            variant={week.is_published ? "outline" : "accent"}
            size="sm"
            className="gap-1.5"
            successMessage={
              week.is_published ? "Week unpublished" : "Week published"
            }
          >
            {week.is_published ? "Unpublish" : "Publish"}
          </ActionButton>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/manage/courses/${courseId}/weeks/${weekId}/lessons/new`}>
              <Plus className="h-3.5 w-3.5" />
              Add lesson
            </Link>
          </Button>
          <Button variant="accent" size="sm" className="gap-1.5" disabled>
            <ClipboardCheck className="h-3.5 w-3.5" />
            Add assignment
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5 shrink-0">
            <CalendarClock className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm mb-0.5">
              Drip scheduling
            </p>
            <p className="text-sm text-muted-foreground">
              Week {String(week.week_number)} unlocks{" "}
              {Number(week.week_number) - 1} week
              {Number(week.week_number) - 1 === 1 ? "" : "s"} after the cohort
              starts. Students can only access lessons once the week unlocks.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">Lessons</h2>
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/manage/courses/${courseId}/weeks/${weekId}/lessons/new`}>
              <Plus className="h-3.5 w-3.5" />
              Add lesson
            </Link>
          </Button>
        </div>

        {lessons && lessons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-semibold text-muted-foreground w-14">
                    Order
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Title
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Type
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Duration
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Video
                  </th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lessons.map((lesson: Record<string, unknown>) => {
                  const TypeIcon = lessonTypeIcon(String(lesson.lesson_type));
                  const asset = assetByLesson.get(String(lesson.id));
                  return (
                    <tr
                      key={String(lesson.id)}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 pr-4 font-heading font-bold text-muted-foreground">
                        {String(lesson.sort_order)}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {String(lesson.title)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant="outline"
                          className="capitalize gap-1 text-[10px]"
                        >
                          <TypeIcon className="h-3 w-3" />
                          {String(lesson.lesson_type)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {lesson.duration_minutes != null
                          ? `${String(lesson.duration_minutes)} min`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={
                              lesson.is_published ? "accent" : "outline"
                            }
                            className="text-[10px]"
                          >
                            {lesson.is_published ? "Published" : "Draft"}
                          </Badge>
                          {Boolean(lesson.is_free_preview) && (
                            <Badge variant="electric" className="text-[10px]">
                              Free
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={videoStatusVariant(asset)}
                          className="text-[10px]"
                        >
                          {videoStatusLabel(asset)}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          asChild
                        >
                          <Link
                            href={`/manage/courses/${courseId}/weeks/${weekId}/lessons/${lesson.id}`}
                          >
                            Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center border border-dashed border-border rounded-xl">
            <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-heading font-semibold mb-1">No lessons yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first lesson to this week.
            </p>
            <Button variant="accent" size="sm" className="gap-1.5" asChild>
              <Link
                href={`/manage/courses/${courseId}/weeks/${weekId}/lessons/new`}
              >
                <Plus className="h-3.5 w-3.5" />
                Add lesson
              </Link>
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="font-heading text-lg font-semibold mb-4">Assignments</h2>
        {assignments && assignments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Title
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Due (days)
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Review due (days)
                  </th>
                  <th className="pb-3 font-semibold text-muted-foreground">
                    Reviews / student
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assignments.map((assignment: Record<string, unknown>) => (
                  <tr
                    key={String(assignment.id)}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium">
                      {String(assignment.title)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={
                            assignment.is_required ? "accent" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {assignment.is_required ? "Required" : "Optional"}
                        </Badge>
                        <Badge
                          variant={
                            assignment.is_published ? "default" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {assignment.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {String(assignment.due_date_offset_days)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {String(assignment.review_due_offset_days)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {String(assignment.reviews_per_student)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center border border-dashed border-border rounded-xl">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-heading font-semibold mb-1">
              No assignments yet
            </p>
            <p className="text-sm text-muted-foreground">
              Assignments are managed from the admin area for now.
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href={`/manage/courses/${courseId}`}>Back to course</Link>
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link href={`/courses/${String(course.slug)}`}>
            <Upload className="h-3.5 w-3.5" />
            Preview course page
          </Link>
        </Button>
      </div>
    </div>
  );
}
