import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AiBuddyChat } from "./ai-chat";

export const metadata: Metadata = { title: "AI Study Buddy" };

export default async function AiBuddyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user's active enrollments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, cohort_id, cohort:cohorts (id, name, course_id, course:courses (id, title, slug))")
    .eq("user_id", user.id)
    .in("status", ["active", "completed"]);

  const courseOptions = (enrollments || [])
    .filter((e) => e.cohort)
    .map((e) => {
      const cohort = e.cohort as unknown as {
        course_id: string;
        course?: { title: string };
        name: string;
      };
      return {
        enrollmentId: e.id,
        cohortId: e.cohort_id,
        courseId: cohort.course_id,
        courseTitle: cohort.course?.title || "",
        cohortName: cohort.name || "",
      };
    });

  // Fetch recent conversations
  const { data: conversations } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  // Fetch AI usage for current month
  const monthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const { data: usage } = await supabase
    .from("ai_usage")
    .select("question_count")
    .eq("user_id", user.id)
    .eq("month_year", monthYear);

  const totalQuestions = usage?.reduce((acc, u) => acc + u.question_count, 0) || 0;

  return (
    <AiBuddyChat
      courseOptions={courseOptions}
      conversations={conversations || []}
      questionsUsed={totalQuestions}
      questionsLimit={200}
    />
  );
}
