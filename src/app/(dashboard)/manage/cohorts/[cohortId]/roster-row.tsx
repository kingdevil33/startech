"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateEnrollmentStatusAction,
  removeEnrollmentAction,
} from "./actions";
import { ENROLLMENT_STATUS_OPTIONS } from "./constants";

export function RosterRow({
  enrollmentId,
  initialStatus,
  studentName,
}: {
  enrollmentId: string;
  initialStatus: string;
  studentName: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    const formData = new FormData();
    formData.set("enrollmentId", enrollmentId);
    formData.set("status", status);
    startTransition(async () => {
      const result = await updateEnrollmentStatusAction(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${studentName} is now ${status}`);
      router.refresh();
    });
  }

  function handleRemove() {
    if (
      !window.confirm(
        `Remove ${studentName} from this cohort? Their access will be dropped.`
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("enrollmentId", enrollmentId);
    startTransition(async () => {
      const result = await removeEnrollmentAction(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${studentName} removed`);
      setStatus("dropped");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={pending}
        aria-label={`Enrollment status for ${studentName}`}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {ENROLLMENT_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={pending || status === initialStatus}
        onClick={handleSave}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Save
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 text-destructive hover:text-destructive"
        disabled={pending}
        onClick={handleRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove
      </Button>
    </div>
  );
}
