import { z } from "zod";

// ============================================================
// AUTH
// ============================================================
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name is too long"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================
// PROFILE
// ============================================================
export const profileSchema = z.object({
  fullName: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// ============================================================
// COURSES
// ============================================================
export const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  slug: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  description: z.string().max(500).optional(),
  longDescription: z.string().optional(),
  category: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedDurationWeeks: z.number().int().min(1).max(52),
  certificateRules: z
    .object({
      lessons_complete_percent: z.number().min(0).max(100),
      live_attendance_percent: z.number().min(0).max(100),
      assignments_submitted_percent: z.number().min(0).max(100),
      peer_reviews_completed_percent: z.number().min(0).max(100),
    })
    .optional(),
});
export type CourseInput = z.infer<typeof courseSchema>;

// ============================================================
// COHORTS
// ============================================================
export const cohortSchema = z
  .object({
    name: z.string().min(3).max(200),
    slug: z
      .string()
      .min(3)
      .max(200)
      .regex(/^[a-z0-9-]+$/),
    description: z.string().max(500).optional(),
    price: z.number().min(0),
    currency: z.string().default("GHS"),
    capacity: z.number().int().min(1).max(500),
    enrollmentOpensAt: z.string().datetime(),
    enrollmentClosesAt: z.string().datetime(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().default("Africa/Accra"),
    postAccessDays: z.number().int().min(0).default(90),
  })
  .refine(
    (data) => new Date(data.enrollmentOpensAt) < new Date(data.enrollmentClosesAt),
    { message: "Enrollment open date must be before close date", path: ["enrollmentClosesAt"] }
  )
  .refine(
    (data) => new Date(data.enrollmentClosesAt) <= new Date(data.startsAt),
    { message: "Enrollment must close before or when cohort starts", path: ["startsAt"] }
  )
  .refine(
    (data) => new Date(data.startsAt) < new Date(data.endsAt),
    { message: "Start date must be before end date", path: ["endsAt"] }
  );
export type CohortInput = z.infer<typeof cohortSchema>;

// ============================================================
// LESSONS
// ============================================================
export const lessonSchema = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  content: z.string().optional(),
  lessonType: z.enum(["video", "text", "quiz", "resource"]),
  sortOrder: z.number().int().min(0),
  durationMinutes: z.number().int().min(1).optional(),
  isFreePreview: z.boolean().default(false),
});
export type LessonInput = z.infer<typeof lessonSchema>;

// ============================================================
// ASSIGNMENTS
// ============================================================
export const assignmentSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  rubric: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      max_score: z.number().min(1),
      weight: z.number().min(0.1).max(5),
    })
  ),
  submissionTypes: z.array(z.enum(["file", "link", "text"])),
  dueDateOffsetDays: z.number().int().min(1),
  reviewDueOffsetDays: z.number().int().min(1),
  reviewsPerStudent: z.number().int().min(1).max(5).default(2),
  isAnonymousReview: z.boolean().default(true),
  isRequired: z.boolean().default(true),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

// ============================================================
// SUBMISSIONS
// ============================================================
export const submissionSchema = z.object({
  content: z.string().optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  linkUrl: z.string().url().optional(),
});
export type SubmissionInput = z.infer<typeof submissionSchema>;

// ============================================================
// REVIEWS
// ============================================================
export const reviewSchema = z.object({
  rubricScores: z.array(
    z.object({
      criterion_name: z.string(),
      score: z.number().min(0),
      max_score: z.number(),
      comment: z.string().optional(),
    })
  ),
  feedback: z.string().min(10, "Feedback must be at least 10 characters"),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

// ============================================================
// FORUM
// ============================================================
export const threadSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  content: z.string().min(10, "Content must be at least 10 characters"),
  categoryId: z.string().uuid(),
});
export type ThreadInput = z.infer<typeof threadSchema>;

export const postSchema = z.object({
  content: z.string().min(1, "Post cannot be empty").max(10000),
  parentId: z.string().uuid().optional(),
});
export type PostInput = z.infer<typeof postSchema>;

// ============================================================
// LIVE SESSIONS
// ============================================================
export const liveSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(500).optional(),
  platform: z.enum(["zoom", "youtube", "tiktok", "custom"]),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480),
  joinUrl: z.string().url().optional(),
});
export type LiveSessionInput = z.infer<typeof liveSessionSchema>;

// ============================================================
// AI CHAT
// ============================================================
export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  courseId: z.string().uuid(),
  cohortId: z.string().uuid(),
});
export type AiChatInput = z.infer<typeof aiChatSchema>;

// ============================================================
// COUPON
// ============================================================
export const couponSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9]+$/),
  cohortId: z.string().uuid(),
});
export type CouponInput = z.infer<typeof couponSchema>;
