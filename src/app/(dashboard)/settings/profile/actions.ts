"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileState = {
  error?: string;
  success?: string;
};

export async function updateProfileAction(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const fullName = formData.get("fullName") as string;
  const bio = formData.get("bio") as string;
  const timezone = formData.get("timezone") as string;

  if (!fullName || fullName.trim().length < 2) {
    return { error: "Name must be at least 2 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName.trim(),
      bio: bio?.trim() || null,
      timezone: timezone?.trim() || "Africa/Accra",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings/profile");
  return { success: "Profile updated successfully." };
}
