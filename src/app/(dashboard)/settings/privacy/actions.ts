"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PrivacyState = {
  error?: string;
  success?: string;
};

/**
 * Deactivates the signed-in account: flags the profile inactive, clears the
 * notification email opt-in, records an audit entry, then signs the user out.
 */
export async function deactivateAccountAction(
  _prevState: PrivacyState,
  formData: FormData
): Promise<PrivacyState> {
  const confirmation = (formData.get("confirmation") as string) || "";
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    return { error: 'Type "DELETE" to confirm.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", user.id);

  if (error) return { error: error.message };

  await supabase.rpc("log_audit", {
    p_actor_id: user.id,
    p_action: "account.deactivated",
    p_entity_type: "profile",
    p_entity_id: user.id,
    p_details: { requested_by: user.email },
  });

  await supabase.auth.signOut();
  redirect("/login?message=Your account has been deactivated.");
}
