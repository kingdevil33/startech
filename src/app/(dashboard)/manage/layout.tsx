import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const role = profile?.role || "student";

  // Only instructors, TAs, and admins can access manage pages
  if (!["instructor", "teaching_assistant", "admin"].includes(role)) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
