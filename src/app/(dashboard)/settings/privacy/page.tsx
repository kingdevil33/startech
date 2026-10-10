import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SettingsNav } from "../nav";
import { PrivacyActions } from "./privacy-actions";

export const metadata: Metadata = { title: "Privacy Settings" };

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { count: enrollmentCount },
    { count: paymentCount },
    { count: certificateCount },
    { count: postCount },
    { count: threadCount },
    { data: profile },
  ] = await Promise.all([
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("threads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("profiles").select("full_name, email, created_at").eq("id", user.id).single(),
  ]);

  const stats: [string, number][] = [
    ["Enrollments", enrollmentCount ?? 0],
    ["Payments", paymentCount ?? 0],
    ["Certificates", certificateCount ?? 0],
    ["Forum threads", threadCount ?? 0],
    ["Forum posts", postCount ?? 0],
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Privacy &amp; Data
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.email ? `Data on file for ${profile.email}. ` : ""}
          Export it, review how it is handled, or deactivate your account.
        </p>
      </div>

      <SettingsNav />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-3 text-center">
            <p className="font-heading text-xl font-bold">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <PrivacyActions />
    </div>
  );
}
