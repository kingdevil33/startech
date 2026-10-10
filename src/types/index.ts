import type {
  Role,
  CohortStatus,
  EnrollmentStatus,
  PaymentStatus,
  PaymentGateway,
  SubmissionStatus,
  ReviewStatus,
  LivePlatform,
  MuxAssetStatus,
  NotificationType,
} from "@/lib/constants";

// ============================================================
// DATABASE TYPES (manual until we generate from Supabase)
// ============================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  bio: string | null;
  timezone: string;
  notification_preferences: {
    email: boolean;
    in_app: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  thumbnail_url: string | null;
  instructor_id: string | null;
  category: string | null;
  level: "beginner" | "intermediate" | "advanced" | null;
  estimated_duration_weeks: number;
  is_published: boolean;
  certificate_rules: {
    lessons_complete_percent: number;
    live_attendance_percent: number;
    assignments_submitted_percent: number;
    peer_reviews_completed_percent: number;
  };
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  instructor?: Profile;
  weeks?: Week[];
  cohorts?: Cohort[];
}

export interface Cohort {
  id: string;
  course_id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  capacity: number;
  seats_filled: number;
  enrollment_opens_at: string;
  enrollment_closes_at: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: CohortStatus;
  post_access_days: number;
  coupon_codes: CouponCode[];
  created_at: string;
  updated_at: string;
  // Joined
  course?: Course;
  enrollments_count?: number;
}

export interface CouponCode {
  code: string;
  discount_percent: number;
  max_uses: number;
  used: number;
}

export interface Week {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  week_number: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  lessons?: Lesson[];
  assignments?: Assignment[];
  is_unlocked?: boolean;
}

export interface Lesson {
  id: string;
  week_id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  lesson_type: "video" | "text" | "quiz" | "resource";
  sort_order: number;
  duration_minutes: number | null;
  is_published: boolean;
  is_free_preview: boolean;
  resources: { title: string; url: string; type: string }[];
  created_at: string;
  updated_at: string;
  // Joined
  mux_asset?: MuxAsset;
  progress?: Progress;
}

export interface MuxAsset {
  id: string;
  lesson_id: string;
  mux_asset_id: string | null;
  mux_upload_id: string | null;
  mux_playback_id: string | null;
  status: MuxAssetStatus;
  error_message: string | null;
  duration_seconds: number | null;
  aspect_ratio: string | null;
  resolution_tier: string | null;
  max_resolution: string | null;
  captions_url: string | null;
  transcript: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiveSession {
  id: string;
  cohort_id: string;
  week_id: string | null;
  title: string;
  description: string | null;
  platform: LivePlatform;
  status: "scheduled" | "live" | "completed" | "cancelled";
  scheduled_at: string;
  duration_minutes: number;
  ends_at: string;
  platform_data: Record<string, unknown>;
  join_url: string | null;
  recording_url: string | null;
  recording_mux_asset_id: string | null;
  host_id: string | null;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  host?: Profile;
  attendance?: LiveAttendance[];
}

export interface LiveAttendance {
  id: string;
  session_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number | null;
  source: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  cohort_id: string;
  status: EnrollmentStatus;
  reserved_until: string | null;
  access_expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Profile;
  cohort?: Cohort;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  enrollment_id: string;
  user_id: string;
  cohort_id: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  gateway_session_id: string | null;
  gateway_payment_id: string | null;
  gateway_receipt_url: string | null;
  coupon_code: string | null;
  discount_amount: number;
  refund_amount: number | null;
  refund_reason: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  enrollment_id: string;
  lesson_id: string;
  is_completed: boolean;
  completed_at: string | null;
  watch_seconds: number;
  total_duration_seconds: number;
  last_position_seconds: number;
  time_spent_seconds: number;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  week_id: string;
  title: string;
  description: string | null;
  rubric: RubricCriterion[];
  submission_types: string[];
  max_file_size_mb: number;
  allowed_file_types: string[];
  due_date_offset_days: number;
  review_due_offset_days: number;
  reviews_per_student: number;
  is_anonymous_review: boolean;
  is_published: boolean;
  is_required: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  due_date?: string;
  review_due_date?: string;
  submission?: Submission;
}

export interface RubricCriterion {
  name: string;
  description: string;
  max_score: number;
  weight: number;
}

export interface Submission {
  id: string;
  assignment_id: string;
  user_id: string;
  enrollment_id: string;
  cohort_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  link_url: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  final_score: number | null;
  instructor_override: boolean;
  instructor_feedback: string | null;
  instructor_score: number | null;
  is_late: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewAssignment {
  id: string;
  submission_id: string;
  reviewer_id: string;
  cohort_id: string;
  assignment_id: string;
  status: ReviewStatus;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  submission?: Submission;
  review?: Review;
}

export interface Review {
  id: string;
  review_assignment_id: string;
  reviewer_id: string;
  submission_id: string;
  rubric_scores: {
    criterion_name: string;
    score: number;
    max_score: number;
    comment?: string;
  }[];
  overall_score: number | null;
  feedback: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  quality_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ForumCategory {
  id: string;
  cohort_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_locked: boolean;
  lesson_id: string | null;
  created_at: string;
}

export interface Thread {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_hidden: boolean;
  accepted_post_id: string | null;
  reply_count: number;
  view_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Profile;
  posts?: Post[];
}

export interface Post {
  id: string;
  thread_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_hidden: boolean;
  is_reported: boolean;
  report_reason: string | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  author?: Profile;
  reactions?: Reaction[];
  replies?: Post[];
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  enrollment_id: string;
  course_id: string;
  cohort_id: string;
  certificate_number: string;
  student_name: string;
  course_title: string;
  cohort_name: string;
  completion_data: Record<string, unknown>;
  pdf_url: string | null;
  issued_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  is_revoked: boolean;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  cohort_id: string | null;
  is_read: boolean;
  read_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
}

export interface AiConversation {
  id: string;
  user_id: string;
  course_id: string;
  cohort_id: string;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources: {
    chunk_id: string;
    lesson_title: string;
    week_number: number;
    relevance_score: number;
    timestamp_link?: string;
  }[];
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  feedback: "up" | "down" | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================
// ENROLLMENT PROGRESS (computed)
// ============================================================
export interface EnrollmentProgress {
  total_lessons: number;
  completed_lessons: number;
  lessons_percent: number;
  total_sessions: number;
  attended_sessions: number;
  attendance_percent: number;
}
