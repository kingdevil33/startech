import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile Settings",
};

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Profile Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal information and preferences.
        </p>
      </div>

      <ProfileForm
        profile={{
          id: profile.id,
          full_name: profile.full_name,
          email: user.email || "",
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          timezone: profile.timezone,
        }}
      />
    </div>
  );
}
