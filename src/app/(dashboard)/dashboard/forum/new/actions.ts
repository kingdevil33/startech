"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, forumRateLimit } from "@/lib/rate-limit";

export async function createThread({
  categoryId,
  title,
  content,
}: {
  categoryId: string;
  title: string;
  content: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (!title.trim()) return { error: "Title is required" };
  if (!content.trim()) return { error: "Content is required" };

  const limit = await checkRateLimit(forumRateLimit, `forum:${user.id}`);
  if (!limit.success) {
    return { error: "You're posting too quickly. Please slow down." };
  }

  const { data, error } = await supabase
    .from("threads")
    .insert({
      category_id: categoryId,
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { threadId: data.id };
}
