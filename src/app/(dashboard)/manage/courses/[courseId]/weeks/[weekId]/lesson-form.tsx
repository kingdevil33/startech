"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { createLessonAction, deleteLessonAction, updateLessonAction } from "../../../actions";

type FormState = { success?: boolean; error?: string };

type Resource = { title: string; url: string; type: string };

interface LessonFormProps {
  mode: "create" | "edit";
  weekId: string;
  courseId: string;
  lesson?: {
    id: string;
    title: string;
    slug: string;
    lesson_type: string;
    description: string | null;
    content: string | null;
    sort_order: number;
    duration_minutes: number | null;
    is_published: boolean;
    is_free_preview: boolean;
    resources: Resource[] | null;
  };
}

export function LessonForm({ mode, weekId, courseId, lesson }: LessonFormProps) {
  const action = mode === "create" ? createLessonAction : updateLessonAction;
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      formData.set("weekId", weekId);
      if (lesson) formData.set("lessonId", lesson.id);
      return action(formData);
    },
    {} as FormState
  );

  const [title, setTitle] = useState(lesson?.title || "");
  const [slug, setSlug] = useState(lesson?.slug || "");
  const slugEdited = useRef(Boolean(lesson));
  const [resources, setResources] = useState<Resource[]>(
    lesson?.resources && Array.isArray(lesson.resources) ? lesson.resources : []
  );

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugEdited.current) setSlug(slugify(value));
  }

  function updateResource(index: number, patch: Partial<Resource>) {
    setResources((current) =>
      current.map((resource, i) =>
        i === index ? { ...resource, ...patch } : resource
      )
    );
  }

  function removeResource(index: number) {
    setResources((current) => current.filter((_, i) => i !== index));
  }

  function addResource() {
    setResources((current) => [...current, { title: "", url: "", type: "file" }]);
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-4 text-sm text-accent-600 dark:text-accent-400 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          {mode === "create" ? "Lesson created." : "Lesson saved."}
        </div>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold">Lesson details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              name="title"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Getting started with HTML"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-slug">Slug</Label>
            <Input
              id="lesson-slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                slugEdited.current = true;
                setSlug(e.target.value);
              }}
              placeholder="getting-started-with-html"
            />
            <p className="text-[11px] text-muted-foreground">
              Derived from the title until you edit it. Unique per week.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-type">Type</Label>
            <select
              id="lesson-type"
              name="lesson_type"
              defaultValue={lesson?.lesson_type || "video"}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="video">Video</option>
              <option value="text">Text</option>
              <option value="quiz">Quiz</option>
              <option value="resource">Resource</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration_minutes">Duration (minutes)</Label>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={0}
              defaultValue={lesson?.duration_minutes ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort order</Label>
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              min={0}
              defaultValue={lesson?.sort_order ?? 0}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lesson-description">Description</Label>
          <Textarea
            id="lesson-description"
            name="description"
            rows={3}
            defaultValue={lesson?.description || ""}
            placeholder="Short summary shown in the syllabus"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lesson-content">Content</Label>
          <Textarea
            id="lesson-content"
            name="content"
            rows={12}
            defaultValue={lesson?.content || ""}
            placeholder="Write the lesson content here..."
          />
          <p className="text-[11px] text-muted-foreground">
            Markdown supported.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="is_published"
              value="true"
              defaultChecked={Boolean(lesson?.is_published)}
              className="h-4 w-4 rounded border-input accent-accent-500"
            />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="is_free_preview"
              value="true"
              defaultChecked={Boolean(lesson?.is_free_preview)}
              className="h-4 w-4 rounded border-input accent-accent-500"
            />
            Free preview
          </label>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold">Resources</h2>
            <p className="text-sm text-muted-foreground">
              Downloadable links attached to this lesson.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addResource}
          >
            <Plus className="h-3.5 w-3.5" />
            Add resource
          </Button>
        </div>

        <input
          type="hidden"
          name="resources"
          value={JSON.stringify(
            resources.filter((r) => r.title.trim() || r.url.trim())
          )}
        />

        {resources.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
            No resources yet.
          </p>
        ) : (
          <div className="space-y-3">
            {resources.map((resource, index) => (
              <div
                key={index}
                className="rounded-lg border border-border p-3 grid sm:grid-cols-[1fr_2fr_auto_auto] gap-2 items-end"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input
                    value={resource.title}
                    onChange={(e) =>
                      updateResource(index, { title: e.target.value })
                    }
                    placeholder="Cheat sheet"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">URL</Label>
                  <Input
                    type="url"
                    value={resource.url}
                    onChange={(e) =>
                      updateResource(index, { url: e.target.value })
                    }
                    placeholder="https://..."
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select
                    value={resource.type}
                    onChange={(e) =>
                      updateResource(index, { type: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="file">File</option>
                    <option value="link">Link</option>
                    <option value="pdf">PDF</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeResource(index)}
                  aria-label="Remove resource"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        {mode === "edit" && (
          <Button type="button" variant="outline" asChild>
            <Link href={`/manage/courses/${courseId}/weeks/${weekId}`}>
              Back to week
            </Link>
          </Button>
        )}
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Create lesson" : "Save lesson"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteLessonButton({
  lessonId,
  weekPath,
}: {
  lessonId: string;
  weekPath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this lesson? This cannot be undone.")) return;
    const formData = new FormData();
    formData.set("lessonId", lessonId);
    startTransition(async () => {
      const result = await deleteLessonAction(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Lesson deleted");
      router.push(weekPath);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      className="gap-1.5"
      disabled={pending}
      onClick={handleDelete}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Delete lesson
    </Button>
  );
}
