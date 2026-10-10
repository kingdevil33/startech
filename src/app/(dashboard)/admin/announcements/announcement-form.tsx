"use client";

import { useActionState } from "react";
import { Loader2, Send, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  sendAnnouncementAction,
  type AnnouncementState,
} from "./actions";

const AUDIENCES = [
  { value: "all", label: "All active users" },
  { value: "students", label: "Students only" },
  { value: "instructors", label: "Instructors & TAs" },
];

export function AnnouncementForm() {
  const initialState: AnnouncementState = {};
  const [state, formAction, isPending] = useActionState(
    sendAnnouncementAction,
    initialState
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
          {state.success}
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="audience">Audience</Label>
            <select
              id="audience"
              name="audience"
              defaultValue="all"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {AUDIENCES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              maxLength={120}
              required
              placeholder="New cohort starts Monday"
            />
            <p className="text-[11px] text-muted-foreground">
              Max 120 characters.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            name="body"
            required
            rows={5}
            placeholder="Write what students should know..."
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="gradient" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Announcement
              </>
            )}
          </Button>
        </div>
      </Card>
    </form>
  );
}
