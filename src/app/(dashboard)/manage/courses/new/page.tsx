import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CourseCreateForm } from "../course-create-form";

export const metadata: Metadata = { title: "Create Course" };

export default async function NewCoursePage() {
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

  // Admins can assign the course to any instructor.
  let instructors:
    | { id: string; full_name: string | null; email: string }[]
    | undefined;
  if (profile.role === "admin") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("role", ["instructor", "teaching_assistant", "admin"])
      .eq("is_active", true)
      .order("full_name");
    instructors = data || [];
  }

  return (
    <div className="space-y-6 animate-fade-up max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Create Course
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up the course blueprint. You can add weeks and lessons after.
        </p>
      </div>
      <CourseCreateForm instructors={instructors} />
    </div>
  );
}
