"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationPreferences,
} from "./constants";

export type NotificationState = {
  error?: string;
  success?: string;
};

export async function updateNotificationPreferencesAction(
  _prevState: NotificationState,
  formData: FormData
): Promise<NotificationState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const read = (name: string) => formData.get(name) === "on";

  const categories: NotificationPreferences["categories"] = {};
  for (const category of NOTIFICATION_CATEGORIES) {
    const key: NotificationCategory = category;
    categories[key] = {
      email: read(`email_${key}`),
      in_app: read(`in_app_${key}`),
    };
  }

  const preferences: NotificationPreferences = {
    email: read("email"),
    in_app: read("in_app"),
    categories,
  };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: preferences })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/notifications");
  return { success: "Notification preferences saved." };
}
