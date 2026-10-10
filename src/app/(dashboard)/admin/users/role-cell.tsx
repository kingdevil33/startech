"use client";

import { useTransition, useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateUserRoleAction } from "../actions";

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teaching_assistant", label: "Teaching Assistant" },
  { value: "instructor", label: "Instructor" },
  { value: "admin", label: "Admin" },
];

interface RoleCellProps {
  userId: string;
  role: string;
  disabled?: boolean;
}

export function RoleCell({ userId, role, disabled }: RoleCellProps) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(role);

  function handleSave() {
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", value);

    startTransition(async () => {
      const result = await updateUserRoleAction(formData);
      if (result.error) {
        toast.error(result.error);
        setValue(role);
      } else {
        toast.success("Role updated");
      }
    });
  }

  const changed = value !== role;

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={disabled || pending}
        onChange={(e) => setValue(e.target.value)}
        aria-label="User role"
        className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        disabled={disabled || pending || !changed}
        onClick={handleSave}
      >
        <Shield className="h-3 w-3" />
        Save
      </Button>
    </div>
  );
}
