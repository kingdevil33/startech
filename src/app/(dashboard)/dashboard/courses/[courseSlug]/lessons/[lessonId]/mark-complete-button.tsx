"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markLessonComplete } from "./actions";

interface MarkCompleteButtonProps {
  lessonId: string;
  enrollmentId: string;
  isCompleted: boolean;
}

export function MarkCompleteButton({
  lessonId,
  enrollmentId,
  isCompleted: initialCompleted,
}: MarkCompleteButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const result = await markLessonComplete({
        lessonId,
        enrollmentId,
        completed: !completed,
      });
      if (result.success) {
        setCompleted(!completed);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={completed ? "default" : "accent"}
      size="lg"
      onClick={handleToggle}
      disabled={loading}
      className="gap-2 flex-1 sm:flex-none"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : completed ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
      {completed ? "Completed" : "Mark as Complete"}
    </Button>
  );
}
