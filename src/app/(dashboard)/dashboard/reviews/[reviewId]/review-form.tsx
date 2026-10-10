"use client";

import { useState } from "react";
import { Send, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { submitReview } from "./actions";

interface RubricCriterion {
  name: string;
  description: string;
  max_score: number;
  weight: number;
}

interface ReviewFormProps {
  reviewAssignmentId: string;
  submissionId: string;
  rubric: RubricCriterion[];
}

const FALLBACK_RUBRIC: RubricCriterion[] = [
  {
    name: "Overall work",
    description: "Rate the quality of this submission.",
    max_score: 100,
    weight: 1,
  },
];

export function ReviewForm({
  reviewAssignmentId,
  submissionId,
  rubric,
}: ReviewFormProps) {
  // Always show at least one criterion so the form is never empty
  const criteria = rubric.length > 0 ? rubric : FALLBACK_RUBRIC;

  const [scores, setScores] = useState<
    { criterion_name: string; score: number; max_score: number; comment: string }[]
  >(
    criteria.map((c) => ({
      criterion_name: c.name,
      score: 0,
      max_score: c.max_score,
      comment: "",
    }))
  );
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function updateScore(index: number, value: number) {
    setScores((prev) =>
      prev.map((s, i) => (i === index ? { ...s, score: value } : s))
    );
  }

  function updateComment(index: number, comment: string) {
    setScores((prev) =>
      prev.map((s, i) => (i === index ? { ...s, comment } : s))
    );
  }

  const overallScore =
    scores.length > 0
      ? Math.round(
          (scores.reduce((acc, s) => acc + s.score, 0) /
            scores.reduce((acc, s) => acc + s.max_score, 0)) *
            100
        )
      : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await submitReview({
        reviewAssignmentId,
        submissionId,
        rubricScores: scores,
        overallScore,
        feedback: feedback.trim(),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Failed to submit review.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="p-8 text-center">
        <div className="rounded-full bg-accent-500/10 p-4 w-fit mx-auto mb-4">
          <Star className="h-8 w-8 text-accent-500" />
        </div>
        <h2 className="font-heading text-xl font-bold mb-2">
          Review Submitted!
        </h2>
        <p className="text-sm text-muted-foreground">
          Thank you for reviewing your peer&apos;s work.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-electric-500" />
        Your Review
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Rubric scoring */}
        {scores.map((score, i) => {
          const criterion = criteria[i];
          return (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm">{criterion.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    Max: {criterion.max_score}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {criterion.description}
                </p>
              </div>

              <div>
                <Label className="text-xs">
                  Score (0 – {criterion.max_score})
                </Label>
                <input
                  type="range"
                  min={0}
                  max={criterion.max_score}
                  step={1}
                  value={score.score}
                  onChange={(e) => updateScore(i, Number(e.target.value))}
                  className="w-full mt-1 accent-accent-500"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                  <span>0</span>
                  <span className="font-heading font-bold text-foreground text-sm">
                    {score.score}
                  </span>
                  <span>{criterion.max_score}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Comment (optional)</Label>
                <Textarea
                  placeholder="Feedback for this criterion..."
                  rows={2}
                  value={score.comment}
                  onChange={(e) => updateComment(i, e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          );
        })}

        <Separator />

        {/* Overall score display */}
        <div className="flex items-center justify-between px-1">
          <span className="font-medium">Overall Score</span>
          <span className="text-2xl font-heading font-bold text-accent-500">
            {overallScore}%
          </span>
        </div>

        {/* Written feedback */}
        <div>
          <Label htmlFor="feedback">General Feedback</Label>
          <Textarea
            id="feedback"
            placeholder="Write constructive feedback for your peer..."
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Review
          </Button>
        </div>
      </form>
    </Card>
  );
}
