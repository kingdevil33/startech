import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CohortForm } from "../cohort-form";

export const metadata: Metadata = { title: "Create Cohort" };

export default async function NewCohortPage() {
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

  let query = supabase
    .from("courses")
    .select("id, title")
    .order("title");

  if (profile.role !== "admin") {
    query = query.eq("instructor_id", user.id);
  }

  const { data: courses } = await query;

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Create Cohort
        </h1>
        <p className="text-muted-foreground mt-1">
          Schedule a priced run of a course with capacity and enrollment dates.
        </p>
      </div>
      <CohortForm mode="create" courses={courses || []} />
    </div>
  );
}
