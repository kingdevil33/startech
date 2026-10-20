"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { createCourseAction } from "./actions";

type FormState = { success?: boolean; error?: string };

type InstructorOption = { id: string; full_name: string | null; email: string };

interface CourseCreateFormProps {
  instructors?: InstructorOption[];
}

export function CourseCreateForm({ instructors }: CourseCreateFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) =>
      createCourseAction(formData),
    {} as FormState
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const slugEdited = useRef(false);

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
          Course created.
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
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugEdited.current) setSlug(slugify(e.target.value));
              }}
              placeholder="Intro to Web Development"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                slugEdited.current = true;
                setSlug(e.target.value);
              }}
              placeholder="intro-to-web-development"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              name="category"
              placeholder="Web Development"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <select
              id="level"
              name="level"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No level</option>
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
              defaultValue={8}
            />
          </div>
          {instructors && instructors.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="instructorId">Instructor</Label>
              <select
                id="instructorId"
                name="instructorId"
                defaultValue=""
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Unassigned</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.full_name || i.email}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Short description</Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            placeholder="One-line summary shown in listings"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="long_description">Long description</Label>
          <Textarea
            id="long_description"
            name="long_description"
            rows={6}
            placeholder="Full course description (markdown supported)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
          <Input
            id="thumbnail_url"
            name="thumbnail_url"
            type="url"
            placeholder="https://..."
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold">Certificate rules</h2>
        <p className="text-sm text-muted-foreground">
          Minimum percentages required for students to earn a certificate.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lessons_complete_percent">Lessons</Label>
            <Input
              id="lessons_complete_percent"
              name="lessons_complete_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="live_attendance_percent">Live attendance</Label>
            <Input
              id="live_attendance_percent"
              name="live_attendance_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={70}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignments_submitted_percent">Assignments</Label>
            <Input
              id="assignments_submitted_percent"
              name="assignments_submitted_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="peer_reviews_completed_percent">Peer reviews</Label>
            <Input
              id="peer_reviews_completed_percent"
              name="peer_reviews_completed_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={100}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="accent" className="gap-2" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Create course
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/manage/courses">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
