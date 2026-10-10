import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  NOTIFICATION_CATEGORIES,
  CATEGORY_LABELS,
  type NotificationPreferences,
} from "./constants";
import { PreferencesForm } from "./preferences-form";
import { SettingsNav } from "../nav";

export const metadata: Metadata = { title: "Notification Settings" };

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  in_app: true,
  categories: {},
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const stored = (profile?.notification_preferences ??
    DEFAULT_PREFERENCES) as Partial<NotificationPreferences>;

  const preferences: NotificationPreferences = {
    email: stored.email ?? true,
    in_app: stored.in_app ?? true,
    categories: stored.categories ?? {},
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose what lands in your inbox and your in-app notification feed.
        </p>
      </div>

      <SettingsNav />

      <PreferencesForm
        preferences={preferences}
        labels={CATEGORY_LABELS}
        categories={NOTIFICATION_CATEGORIES}
      />
    </div>
  );
}
