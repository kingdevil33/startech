import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { CohortForm } from "../../cohort-form";

export const metadata: Metadata = { title: "Edit Cohort" };

type Props = { params: Promise<{ cohortId: string }> };

export default async function EditCohortPage({ params }: Props) {
  const { cohortId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["instructor", "admin", "teaching_assistant"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("*, course:courses(id, instructor_id)")
    .eq("id", cohortId)
    .maybeSingle();

  const course = Array.isArray(cohort?.course)
    ? cohort?.course[0]
    : cohort?.course;

  if (!cohort || !course) notFound();

  if (course.instructor_id !== user.id && profile.role !== "admin") {
    redirect("/manage/cohorts");
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Edit Cohort
        </h1>
        <p className="text-muted-foreground mt-1">
          Update pricing, schedule, capacity, and coupons.
        </p>
      </div>
      <CohortForm
        mode="edit"
        cohort={{
          id: cohort.id,
          course_id: cohort.course_id,
          name: cohort.name,
          slug: cohort.slug,
          description: cohort.description || "",
          price: cohort.price,
          currency: cohort.currency,
          capacity: cohort.capacity,
          enrollment_opens_at: cohort.enrollment_opens_at,
          enrollment_closes_at: cohort.enrollment_closes_at,
          starts_at: cohort.starts_at,
          ends_at: cohort.ends_at,
          timezone: cohort.timezone,
          post_access_days: cohort.post_access_days,
          coupon_codes: cohort.coupon_codes || [],
        }}
      />
    </div>
  );
}
