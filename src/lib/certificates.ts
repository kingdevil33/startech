import type { SupabaseClient } from "@supabase/supabase-js";

export type CertificateRules = {
  lessons_complete_percent: number;
  live_attendance_percent: number;
  assignments_submitted_percent: number;
  peer_reviews_completed_percent: number;
};

export const DEFAULT_RULES: CertificateRules = {
  lessons_complete_percent: 80,
  live_attendance_percent: 70,
  assignments_submitted_percent: 100,
  peer_reviews_completed_percent: 100,
};

export type CompletionStats = {
  lessons_percent: number;
  attendance_percent: number;
  assignments_percent: number;
  reviews_percent: number;
};

export type EligibilityResult = {
  eligible: boolean;
  stats: CompletionStats;
  rules: CertificateRules;
  /** Rules that are not yet satisfied */
  missing: (keyof CertificateRules)[];
};

type AdminClient = SupabaseClient;

/**
 * Compute completion percentages for an enrollment.
 * Lessons/attendance come from the SQL helper; assignments and reviews are
 * derived from the related tables.
 */
export async function getCompletionStats(
  admin: AdminClient,
  enrollment: {
    id: string;
    user_id: string;
    cohort_id: string;
    course_id?: string;
  },
  courseId: string
): Promise<CompletionStats> {
  const [{ data: progress }, assignments, reviews] = await Promise.all([
    admin.rpc("get_enrollment_progress", { p_enrollment_id: enrollment.id }),
    admin
      .from("assignments")
      .select("id, is_required, week:weeks!inner (course_id, is_published)")
      .eq("weeks.course_id", courseId)
      .eq("weeks.is_published", true),
    admin
      .from("review_assignments")
      .select("id, status")
      .eq("reviewer_id", enrollment.user_id),
  ]);

  const progressData = (progress ?? {}) as {
    lessons_percent?: number;
    attendance_percent?: number;
  };

  // Assignments: submitted (or graded) / required published assignments
  const required = (assignments?.data ?? []).filter((a) => a.is_required);
  let assignmentsPercent = 100;
  if (required.length > 0) {
    const { data: subs } = await admin
      .from("submissions")
      .select("id, assignment_id, status")
      .eq("enrollment_id", enrollment.id)
      .in("status", ["submitted", "late", "graded"]);

    const submittedIds = new Set((subs ?? []).map((s) => s.assignment_id));
    const done = required.filter((a) => submittedIds.has(a.id)).length;
    assignmentsPercent = Math.round((done / required.length) * 100);
  }

  // Peer reviews: completed / assigned (nothing assigned → nothing missing)
  const assigned = reviews?.data ?? [];
  const completed = assigned.filter((r) => r.status === "completed").length;
  const reviewsPercent =
    assigned.length === 0
      ? 100
      : Math.round((completed / assigned.length) * 100);

  return {
    lessons_percent: Number(progressData.lessons_percent ?? 0),
    attendance_percent: Number(progressData.attendance_percent ?? 0),
    assignments_percent: assignmentsPercent,
    reviews_percent: reviewsPercent,
  };
}

/** Compare stats against the course's configurable certificate rules. */
export function checkEligibility(
  stats: CompletionStats,
  rules: CertificateRules
): EligibilityResult {
  const missing: (keyof CertificateRules)[] = [];

  if (stats.lessons_percent < rules.lessons_complete_percent)
    missing.push("lessons_complete_percent");
  if (stats.attendance_percent < rules.live_attendance_percent)
    missing.push("live_attendance_percent");
  if (stats.assignments_percent < rules.assignments_submitted_percent)
    missing.push("assignments_submitted_percent");
  if (stats.reviews_percent < rules.peer_reviews_completed_percent)
    missing.push("peer_reviews_completed_percent");

  return { eligible: missing.length === 0, stats, rules, missing };
}

export type IssuedCertificate = {
  id: string;
  certificate_number: string;
  student_name: string;
  course_title: string;
  verify_url: string;
  linkedin_url: string;
};

function buildLinkedInUrl(certificateNumber: string, courseTitle: string) {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: courseTitle,
    organizationName: "StarTech Academy",
    issueYear: String(new Date().getFullYear()),
    issueMonth: String(new Date().getMonth() + 1),
    certUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${certificateNumber}`,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/**
 * Issue a certificate for an enrollment. Idempotent: returns the existing
 * certificate when one has already been issued (the DB also enforces
 * `certificates_enrollment_unique`).
 */
export async function issueCertificate(
  admin: AdminClient,
  params: {
    enrollment: {
      id: string;
      user_id: string;
      cohort_id: string;
      course_id: string;
    };
    stats: CompletionStats;
    studentName: string;
    courseTitle: string;
    cohortName: string;
  }
): Promise<IssuedCertificate | null> {
  const { data: existing } = await admin
    .from("certificates")
    .select("id, certificate_number, student_name, course_title, linkedin_url")
    .eq("enrollment_id", params.enrollment.id)
    .maybeSingle();

  if (existing) {
    return {
      ...existing,
      verify_url: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${existing.certificate_number}`,
      linkedin_url:
        existing.linkedin_url ||
        buildLinkedInUrl(existing.certificate_number, existing.course_title),
    };
  }

  const { data: number, error: numberError } = await admin.rpc(
    "generate_certificate_number"
  );
  if (numberError || !number) {
    console.error("certificate number failed:", numberError?.message);
    return null;
  }

  const linkedinUrl = buildLinkedInUrl(number, params.courseTitle);

  const { data: certificate, error } = await admin
    .from("certificates")
    .insert({
      user_id: params.enrollment.user_id,
      enrollment_id: params.enrollment.id,
      course_id: params.enrollment.course_id,
      cohort_id: params.enrollment.cohort_id,
      certificate_number: number,
      student_name: params.studentName,
      course_title: params.courseTitle,
      cohort_name: params.cohortName,
      completion_data: params.stats,
      linkedin_url: linkedinUrl,
      issued_at: new Date().toISOString(),
    })
    .select("id, certificate_number, student_name, course_title, linkedin_url")
    .single();

  if (error) {
    console.error("certificate insert failed:", error.message);
    return null;
  }

  return {
    ...certificate,
    verify_url: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${certificate.certificate_number}`,
    linkedin_url: certificate.linkedin_url ?? linkedinUrl,
  };
}

/**
 * Full check-and-issue flow for one enrollment.
 * Returns the issued certificate, or null when not eligible / already issued.
 */
export async function checkAndIssueCertificate(
  admin: AdminClient,
  enrollmentId: string
): Promise<{ issued: IssuedCertificate | null; eligibility: EligibilityResult }> {
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id, user_id, cohort_id, status")
    .eq("id", enrollmentId)
    .single();

  const empty: EligibilityResult = {
    eligible: false,
    stats: {
      lessons_percent: 0,
      attendance_percent: 0,
      assignments_percent: 0,
      reviews_percent: 0,
    },
    rules: DEFAULT_RULES,
    missing: [],
  };

  if (!enrollment || enrollment.status !== "active") {
    return { issued: null, eligibility: empty };
  }

  const { data: cohort } = await admin
    .from("cohorts")
    .select("id, name, course_id, course:courses (id, title, certificate_rules)")
    .eq("id", enrollment.cohort_id)
    .single();

  if (!cohort) return { issued: null, eligibility: empty };

  const courseRel = Array.isArray(cohort.course)
    ? (cohort.course as unknown as {
        id: string;
        title: string;
        certificate_rules?: CertificateRules;
      }[])[0]
    : (cohort.course as unknown as {
        id: string;
        title: string;
        certificate_rules?: CertificateRules;
      } | null);

  if (!courseRel) return { issued: null, eligibility: empty };

  const rules = { ...DEFAULT_RULES, ...(courseRel.certificate_rules ?? {}) };
  const stats = await getCompletionStats(
    admin,
    { ...enrollment, course_id: courseRel.id },
    courseRel.id
  );
  const eligibility = checkEligibility(stats, rules);

  if (!eligibility.eligible) {
    return { issued: null, eligibility };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", enrollment.user_id)
    .single();

  const issued = await issueCertificate(admin, {
    enrollment: {
      id: enrollment.id,
      user_id: enrollment.user_id,
      cohort_id: enrollment.cohort_id,
      course_id: courseRel.id,
    },
    stats,
    studentName: profile?.full_name || profile?.email || "Student",
    courseTitle: courseRel.title,
    cohortName: cohort.name,
  });

  return { issued, eligibility };
}
