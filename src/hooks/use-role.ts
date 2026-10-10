"use client";

import { useUser } from "./use-user";
import type { Role } from "@/lib/constants";

export function useRole() {
  const { user, loading } = useUser();

  const role: Role = user?.role || "student";
  const isAdmin = role === "admin";
  const isInstructor = role === "instructor" || role === "teaching_assistant";
  const isStudent = role === "student";
  const isStaff = isAdmin || isInstructor;

  function hasRole(...roles: Role[]): boolean {
    return roles.includes(role);
  }

  return {
    role,
    isAdmin,
    isInstructor,
    isStudent,
    isStaff,
    hasRole,
    loading,
  };
}
