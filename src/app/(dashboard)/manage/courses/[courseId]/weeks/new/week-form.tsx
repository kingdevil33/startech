"use client";

import { useActionState } from "react";
import { AlertTriangle, Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createWeekAction } from "../../../actions";

type FormState = { success?: boolean; error?: string };

interface WeekFormProps {
  courseId: string;
  defaultWeekNumber: number;
}

export function WeekForm({ courseId, defaultWeekNumber }: WeekFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) =>
      createWeekAction(courseId, formData),
    {} as FormState
  );

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
          Week created.
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Week 1 — Foundations"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="week_number">Week number</Label>
          <Input
            id="week_number"
            name="week_number"
            type="number"
            min={1}
            required
            defaultValue={defaultWeekNumber}
          />
          <p className="text-[11px] text-muted-foreground">
            Unlocks {defaultWeekNumber - 1} week
            {defaultWeekNumber - 1 === 1 ? "" : "s"} after the cohort starts.
            Must be unique per course.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            placeholder="What students will cover this week"
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create week
        </Button>
      </div>
    </form>
  );
}
