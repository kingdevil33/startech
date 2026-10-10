export const ENROLLMENT_STATUS_OPTIONS = [
  "active",
  "dropped",
  "completed",
  "refunded",
  "expired",
] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUS_OPTIONS)[number];

export const COHORT_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["enrollment_open"],
  enrollment_open: ["enrollment_closed"],
  enrollment_closed: ["active"],
  active: ["completed"],
  completed: ["archived"],
};

export const NEXT_COHORT_STATUS: Record<string, string> = {
  draft: "enrollment_open",
  enrollment_open: "enrollment_closed",
  enrollment_closed: "active",
  active: "completed",
  completed: "archived",
};

export const SESSION_PLATFORMS = ["zoom", "youtube", "tiktok", "custom"] as const;

export type SessionPlatform = (typeof SESSION_PLATFORMS)[number];

export type SubmissionStatusVariant =
  | "accent"
  | "electric"
  | "destructive"
  | "outline";

export const SUBMISSION_STATUS_VARIANTS: Record<string, SubmissionStatusVariant> =
  {
    graded: "accent",
    submitted: "electric",
    late: "destructive",
    draft: "outline",
  };

export type RosterProfile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
};

export type RosterEntry = {
  id: string;
  status: string;
  created_at: string;
  access_expires_at: string | null;
  user: RosterProfile | null;
};

export type SubmissionEntry = {
  id: string;
  status: string;
  submitted_at: string | null;
  final_score: number | null;
  instructor_score: number | null;
  instructor_feedback: string | null;
  instructor_override: boolean | null;
  user_id: string;
  assignment: unknown;
  user: { full_name: string | null; email: string } | null;
};

export function cohortStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}
