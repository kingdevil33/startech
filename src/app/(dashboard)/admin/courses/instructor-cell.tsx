"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assignInstructorAction } from "../actions";

type InstructorOption = { id: string; full_name: string | null; email: string };

interface InstructorCellProps {
  courseId: string;
  instructorId: string | null;
  instructors: InstructorOption[];
}

export function InstructorCell({
  courseId,
  instructorId,
  instructors,
}: InstructorCellProps) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(instructorId || "");

  function handleSave() {
    const formData = new FormData();
    formData.set("courseId", courseId);
    formData.set("instructorId", value);

    startTransition(async () => {
      const result = await assignInstructorAction(formData);
      if (result.error) {
        toast.error(result.error);
        setValue(instructorId || "");
      } else {
        toast.success("Instructor updated");
      }
    });
  }

  const changed = value !== (instructorId || "");

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Course instructor"
        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 max-w-[140px]"
      >
        <option value="">Unassigned</option>
        {instructors.map((i) => (
          <option key={i.id} value={i.id}>
            {i.full_name || i.email}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || !changed}
        onClick={handleSave}
      >
        Save
      </Button>
    </div>
  );
}
