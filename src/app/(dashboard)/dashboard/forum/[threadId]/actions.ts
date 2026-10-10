"use server";

import { createClient } from "@/lib/supabase/server";

export async function createReply({
  threadId,
  content,
  parentId,
}: {
  threadId: string;
  content: string;
  parentId?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!content.trim()) return { error: "Reply cannot be empty" };

  const { error } = await supabase.from("posts").insert({
    thread_id: threadId,
    author_id: user.id,
    parent_id: parentId || null,
    content: content.trim(),
  });

  if (error) return { error: error.message };
  return { success: true };
}
