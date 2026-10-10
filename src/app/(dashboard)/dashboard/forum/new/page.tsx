import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { NewThreadForm } from "./new-thread-form";

export const metadata: Metadata = { title: "New Thread" };

export default async function NewThreadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user's active enrollments to get cohort IDs
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("cohort_id, cohort:cohorts (id, name, course:courses (title))")
    .eq("user_id", user.id)
    .in("status", ["active", "completed"]);

  const cohortIds = enrollments?.map((e) => e.cohort_id) || [];

  if (cohortIds.length === 0) {
    redirect("/dashboard/forum");
  }

  // Fetch forum categories
  const { data: categories } = await supabase
    .from("forum_categories")
    .select("*")
    .in("cohort_id", cohortIds)
    .eq("is_locked", false)
    .order("sort_order", { ascending: true });

  // Build category options with cohort info
  const categoryOptions = (categories || []).map((cat) => {
    const enrollment = enrollments?.find((e) => e.cohort_id === cat.cohort_id);
    const cohort = enrollment?.cohort as unknown as
      | { name?: string; course?: { title?: string } }
      | null;
    const cohortName = cohort?.name || "";
    const courseTitle = cohort?.course?.title || "";
    return {
      id: cat.id,
      name: cat.name,
      label: `${courseTitle} — ${cohortName} — ${cat.name}`,
    };
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          New Thread
        </h1>
        <p className="text-muted-foreground mt-1">
          Start a new discussion with your cohort.
        </p>
      </div>

      <NewThreadForm categories={categoryOptions} />
    </div>
  );
}
