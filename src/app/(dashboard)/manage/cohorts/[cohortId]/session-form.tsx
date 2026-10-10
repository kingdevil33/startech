"use client";

import { useActionState } from "react";
import { AlertTriangle, CalendarPlus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSessionAction } from "./actions";

type FormState = { success?: boolean; error?: string };

interface SessionFormProps {
  cohortId: string;
  weeks: { id: string; title: string; week_number: number }[];
}

export function SessionForm({ cohortId, weeks }: SessionFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      formData.set("cohortId", cohortId);
      const scheduledAt = ((formData.get("scheduled_at") as string) || "").trim();
      if (scheduledAt) {
        const parsed = new Date(scheduledAt);
        if (!Number.isNaN(parsed.getTime())) {
          formData.set("scheduled_at", parsed.toISOString());
        }
      }
      const platform = ((formData.get("platform") as string) || "").trim();
      const joinUrl = ((formData.get("join_url") as string) || "").trim();
      if (platform !== "zoom" && !joinUrl) {
        return { error: "A join URL is required for this platform" };
      }
      return createSessionAction(formData);
    },
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
          Session scheduled.
        </div>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-accent-500" />
          Schedule a live session
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="session-title">Title</Label>
            <Input
              id="session-title"
              name="title"
              required
              placeholder="Week 1 kickoff"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-platform">Platform</Label>
            <select
              id="session-platform"
              name="platform"
              defaultValue="zoom"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="zoom">Zoom</option>
              <option value="youtube">YouTube Live</option>
              <option value="tiktok">TikTok</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="session-description">Description</Label>
          <Textarea
            id="session-description"
            name="description"
            rows={2}
            placeholder="What will be covered"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="session-week">Week</Label>
            <select
              id="session-week"
              name="week_id"
              defaultValue=""
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">No specific week</option>
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.week_number} — {week.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-time">Starts at</Label>
            <Input
              id="session-time"
              name="scheduled_at"
              type="datetime-local"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-duration">Duration (minutes)</Label>
            <Input
              id="session-duration"
              name="duration_minutes"
              type="number"
              min={5}
              defaultValue={60}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="session-join-url">Join URL</Label>
          <Input
            id="session-join-url"
            name="join_url"
            type="url"
            placeholder="https://zoom.us/j/... (required unless Zoom)"
          />
          <p className="text-[11px] text-muted-foreground">
            Required for YouTube, TikTok, and custom sessions. Zoom meetings can
            be created separately.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="accent" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            Schedule session
          </Button>
        </div>
      </Card>
    </form>
  );
}
