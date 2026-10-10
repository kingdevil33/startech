"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCourseAction } from "../actions";

type FormState = { success?: boolean; error?: string };

type CertificateRules = {
  lessons_complete_percent?: number;
  live_attendance_percent?: number;
  assignments_submitted_percent?: number;
  peer_reviews_completed_percent?: number;
};

interface CourseFormProps {
  course: {
    id: string;
    title: string;
    slug: string;
    category: string | null;
    level: string | null;
    estimated_duration_weeks: number;
    description: string | null;
    long_description: string | null;
    thumbnail_url: string | null;
    meta_title: string | null;
    meta_description: string | null;
    certificate_rules: CertificateRules | null;
  };
}

function percentOf(rules: CertificateRules | null, key: keyof CertificateRules) {
  const value = rules?.[key];
  return typeof value === "number" ? value : 0;
}

export function CourseForm({ course }: CourseFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) =>
      updateCourseAction(formData),
    {} as FormState
  );

  const rules = course.certificate_rules;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="courseId" value={course.id} />

      {state.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-4 text-sm text-accent-600 dark:text-accent-400 flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0" />
          Course details saved.
        </div>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold">Course details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={course.title}
              placeholder="Intro to Web Development"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              defaultValue={course.slug}
              placeholder="intro-to-web-development"
            />
            <p className="text-[11px] text-muted-foreground">
              Public URL: /courses/{course.slug}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              defaultValue={course.category || ""}
              placeholder="Development"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <select
              id="level"
              name="level"
              defaultValue={course.level || ""}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Not set</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_duration_weeks">Duration (weeks)</Label>
            <Input
              id="estimated_duration_weeks"
              name="estimated_duration_weeks"
              type="number"
              min={1}
              defaultValue={course.estimated_duration_weeks}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Short description</Label>
          <Textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={course.description || ""}
            placeholder="One-liner shown on the course catalog"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="long_description">Long description</Label>
          <Textarea
            id="long_description"
            name="long_description"
            rows={8}
            defaultValue={course.long_description || ""}
            placeholder="Full sales page copy (Markdown supported)"
          />
          <p className="text-[11px] text-muted-foreground">
            Markdown supported.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
          <Input
            id="thumbnail_url"
            name="thumbnail_url"
            type="url"
            defaultValue={course.thumbnail_url || ""}
            placeholder="https://..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="meta_title">Meta title</Label>
            <Input
              id="meta_title"
              name="meta_title"
              defaultValue={course.meta_title || ""}
              placeholder="SEO title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meta_description">Meta description</Label>
            <Input
              id="meta_description"
              name="meta_description"
              defaultValue={course.meta_description || ""}
              placeholder="SEO description"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Certificate rules
          </h2>
          <p className="text-sm text-muted-foreground">
            Minimum thresholds a student must hit to earn a certificate.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lessons_complete_percent">
              Lessons completed (%)
            </Label>
            <Input
              id="lessons_complete_percent"
              name="lessons_complete_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={percentOf(rules, "lessons_complete_percent")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="live_attendance_percent">
              Live attendance (%)
            </Label>
            <Input
              id="live_attendance_percent"
              name="live_attendance_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={percentOf(rules, "live_attendance_percent")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignments_submitted_percent">
              Assignments submitted (%)
            </Label>
            <Input
              id="assignments_submitted_percent"
              name="assignments_submitted_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={percentOf(rules, "assignments_submitted_percent")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="peer_reviews_completed_percent">
              Peer reviews completed (%)
            </Label>
            <Input
              id="peer_reviews_completed_percent"
              name="peer_reviews_completed_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={percentOf(rules, "peer_reviews_completed_percent")}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save course
        </Button>
      </div>
    </form>
  );
}
