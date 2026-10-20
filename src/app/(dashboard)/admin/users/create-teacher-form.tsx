"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Check, Loader2, Plus, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createInstructorAction } from "../actions";

type FormState = { success?: boolean; error?: string };

export function CreateTeacherForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (_prev: FormState, formData: FormData) => {
      const result = await createInstructorAction(formData);
      if (result.success) setOpen(false);
      return result;
    },
    {} as FormState
  );

  if (!open) {
    return (
      <Button variant="accent" className="gap-2" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add Teacher
      </Button>
    );
  }

  return (
    <Card className="p-5 w-full sm:w-[420px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Add Teacher</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form action={formAction} className="space-y-4">
        {state.error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-3 text-sm text-accent-600 dark:text-accent-400 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            Teacher account created. Share the credentials with them.
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="teacher-name">Full name</Label>
          <Input
            id="teacher-name"
            name="fullName"
            required
            placeholder="Jane Doe"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacher-email">Email</Label>
          <Input
            id="teacher-email"
            name="email"
            type="email"
            required
            placeholder="jane@startech.dev"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacher-password">Temporary password</Label>
          <Input
            id="teacher-password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacher-role">Role</Label>
          <select
            id="teacher-role"
            name="role"
            defaultValue="instructor"
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="instructor">Instructor</option>
            <option value="teaching_assistant">Teaching Assistant</option>
          </select>
        </div>

        <Button type="submit" variant="accent" className="w-full gap-2" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Create account
        </Button>
      </form>
    </Card>
  );
}
