/** App-wide constants */

// Roles
export const ROLES = {
  ADMIN: "admin",
  INSTRUCTOR: "instructor",
  TEACHING_ASSISTANT: "teaching_assistant",
  STUDENT: "student",
  GUEST: "guest",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Cohort statuses
export const COHORT_STATUS = {
  DRAFT: "draft",
  ENROLLMENT_OPEN: "enrollment_open",
  ENROLLMENT_CLOSED: "enrollment_closed",
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export type CohortStatus = (typeof COHORT_STATUS)[keyof typeof COHORT_STATUS];

// Enrollment statuses
export const ENROLLMENT_STATUS = {
  RESERVED: "reserved",
  ACTIVE: "active",
  COMPLETED: "completed",
  DROPPED: "dropped",
  REFUNDED: "refunded",
  EXPIRED: "expired",
} as const;

export type EnrollmentStatus =
  (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// Payment gateways
export const PAYMENT_GATEWAY = {
  STRIPE: "stripe",
  PAYSTACK: "paystack",
} as const;

export type PaymentGateway =
  (typeof PAYMENT_GATEWAY)[keyof typeof PAYMENT_GATEWAY];

// Assignment submission types
export const SUBMISSION_TYPE = {
  FILE: "file",
  LINK: "link",
  TEXT: "text",
} as const;

export type SubmissionType =
  (typeof SUBMISSION_TYPE)[keyof typeof SUBMISSION_TYPE];

// Submission statuses
export const SUBMISSION_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  LATE: "late",
  GRADED: "graded",
} as const;

export type SubmissionStatus =
  (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

// Review statuses
export const REVIEW_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  LATE: "late",
  SKIPPED: "skipped",
} as const;

export type ReviewStatus =
  (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

// Live session platforms
export const LIVE_PLATFORM = {
  ZOOM: "zoom",
  YOUTUBE: "youtube",
  TIKTOK: "tiktok",
  CUSTOM: "custom",
} as const;

export type LivePlatform =
  (typeof LIVE_PLATFORM)[keyof typeof LIVE_PLATFORM];

// Mux asset statuses
export const MUX_ASSET_STATUS = {
  WAITING: "waiting",
  PREPARING: "preparing",
  READY: "ready",
  ERRORED: "errored",
} as const;

export type MuxAssetStatus =
  (typeof MUX_ASSET_STATUS)[keyof typeof MUX_ASSET_STATUS];

// Notification types
export const NOTIFICATION_TYPE = {
  ENROLLMENT_CONFIRMED: "enrollment_confirmed",
  SESSION_REMINDER: "session_reminder",
  ASSIGNMENT_DUE: "assignment_due",
  REVIEW_ASSIGNED: "review_assigned",
  FORUM_REPLY: "forum_reply",
  FORUM_MENTION: "forum_mention",
  CERTIFICATE_ISSUED: "certificate_issued",
  ANNOUNCEMENT: "announcement",
  REFUND_PROCESSED: "refund_processed",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// Rate limits
export const RATE_LIMITS = {
  AUTH: { requests: 5, window: "1m" as const },
  FORUM_POST: { requests: 10, window: "1m" as const },
  AI_CHAT: { requests: 20, window: "1m" as const },
  API_GENERAL: { requests: 60, window: "1m" as const },
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload limits
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/zip",
  "text/plain",
  "text/markdown",
];

// AI study buddy
export const AI_CONFIG = {
  MODEL: "gpt-4o-mini",
  EMBEDDING_MODEL: "text-embedding-3-small",
  EMBEDDING_DIMENSIONS: 1536,
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.3,
  TOP_K_CHUNKS: 5,
  CHUNK_SIZE: 500,
  CHUNK_OVERLAP: 50,
  MONTHLY_QUESTION_LIMIT: 200,
} as const;

// Seat reservation
export const SEAT_RESERVATION_MINUTES = 15;
