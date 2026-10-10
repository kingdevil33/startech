"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { gradeSubmissionAction } from "./actions";
import { SUBMISSION_STATUS_VARIANTS } from "./constants";

export function GradingRow({
  submissionId,
  studentName,
  studentEmail,
  assignmentTitle,
  status,
  submittedAtLabel,
  scoreLabel,
  initialScore,
  initialFeedback,
}: {
  submissionId: string;
  studentName: string;
  studentEmail: string;
  assignmentTitle: string;
  status: string;
  submittedAtLabel: string;
  scoreLabel: string;
  initialScore: string;
  initialFeedback: string;
}) {
  const [score, setScore] = useState(initialScore);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleGrade() {
    const parsed = Number(score);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Enter a valid score");
      return;
    }
    const formData = new FormData();
    formData.set("submissionId", submissionId);
    formData.set("score", String(parsed));
    formData.set("feedback", feedback);
    startTransition(async () => {
      const result = await gradeSubmissionAction(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Grade saved");
      router.refresh();
    });
  }

  return (
    <tr className="hover:bg-muted/30 transition-colors align-top">
      <td className="py-3 pr-4">
        <p className="font-medium">{studentName}</p>
        <p className="text-xs text-muted-foreground">{studentEmail}</p>
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{assignmentTitle}</td>
      <td className="py-3 pr-4">
        <Badge
          variant={SUBMISSION_STATUS_VARIANTS[status] || "outline"}
          className="capitalize"
        >
          {status}
        </Badge>
      </td>
      <td className="py-3 pr-4 text-xs text-muted-foreground">
        {submittedAtLabel}
      </td>
      <td className="py-3 pr-4 font-heading font-bold">{scoreLabel}</td>
      <td className="py-3 min-w-[260px]">
        <div className="flex flex-col gap-2">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="Score"
            className="h-9 w-24"
            aria-label="Override score"
          />
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
            placeholder="Feedback for the student"
            aria-label="Instructor feedback"
          />
          <div>
            <Button
              type="button"
              variant="accent"
              size="sm"
              className="gap-1.5"
              disabled={pending}
              onClick={handleGrade}
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Override grade
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
}
