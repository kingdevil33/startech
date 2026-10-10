import { createClient } from "@/lib/supabase/server";
import { getNavForRole } from "@/config/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for role-based navigation
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "student";
  const navSections = getNavForRole(role);

  return <DashboardShell navSections={navSections}>{children}</DashboardShell>;
}
