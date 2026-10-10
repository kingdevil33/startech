import { createClient } from "@/lib/supabase/server";
import { getNavForRole } from "@/config/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { redirect } from "next/navigation";

export default async function AdminLayout({
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

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const navSections = getNavForRole("admin");

  return <DashboardShell navSections={navSections}>{children}</DashboardShell>;
}
