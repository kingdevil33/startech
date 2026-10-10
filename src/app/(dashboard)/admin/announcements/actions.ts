"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementState = {
  error?: string;
  success?: string;
  sent?: number;
};

const MAX_RECIPIENTS = 500;

export async function sendAnnouncementAction(
  _prev: AnnouncementState,
  formData: FormData
): Promise<AnnouncementState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Forbidden" };

  const title = ((formData.get("title") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const audienceParam = (formData.get("audience") as string) || "all";
  const audience =
    audienceParam === "students" || audienceParam === "instructors"
      ? audienceParam
      : "all";

  if (!title) return { error: "Title is required." };
  if (title.length > 120) {
    return { error: "Title must be 120 characters or fewer." };
  }
  if (!body) return { error: "Message body is required." };

  const { data: recipients, error: queryError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("is_active", true);

  if (queryError) return { error: queryError.message };

  const targets = (recipients || [])
    .filter((recipient) => {
      if (audience === "students") return recipient.role === "student";
      if (audience === "instructors") {
        return (
          recipient.role === "instructor" ||
          recipient.role === "teaching_assistant"
        );
      }
      return true;
    })
    .slice(0, MAX_RECIPIENTS);

  let sent = 0;
  for (const recipient of targets) {
    const { error } = await supabase.rpc("create_notification", {
      p_user_id: recipient.id,
      p_type: "announcement",
      p_title: title,
      p_body: body,
      p_link: "/notifications",
    });
    if (!error) sent += 1;
  }

  revalidatePath("/admin/announcements");

  await supabase.rpc("log_audit", {
    p_actor_id: user.id,
    p_action: "announcement.sent",
    p_entity_type: "announcement",
    p_entity_id: title,
    p_details: { audience, count: sent },
  });

  return { success: `Sent to ${sent} users`, sent };
}
