import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  MessageCircle,
  CheckCircle2,
  Pin,
  Lock,
  ThumbsUp,
  Heart,
  PartyPopper,
  Eye as EyeIcon,
  Clock,
  Reply,
  Flag,
  MoreHorizontal,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "@/lib/utils";
import { ReplyForm } from "./reply-form";

type Props = {
  params: Promise<{ threadId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { threadId } = await params;
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("threads")
    .select("title")
    .eq("id", threadId)
    .single();

  return { title: thread?.title || "Thread" };
}

export default async function ThreadPage({ params }: Props) {
  const { threadId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch thread with author and category
  const { data: thread } = await supabase
    .from("threads")
    .select(
      `
      *,
      author:profiles!threads_author_id_fkey (id, full_name, avatar_url, role),
      category:forum_categories (id, name, cohort_id)
    `
    )
    .eq("id", threadId)
    .single();

  if (!thread) notFound();

  // Increment view count
  await supabase
    .from("threads")
    .update({ view_count: (thread.view_count || 0) + 1 })
    .eq("id", threadId);

  // Fetch posts with authors and reactions
  const { data: posts } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles!posts_author_id_fkey (id, full_name, avatar_url, role),
      reactions (id, emoji, user_id)
    `
    )
    .eq("thread_id", threadId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true });

  // Separate root-level posts and replies
  const rootPosts = posts?.filter((p) => !p.parent_id) || [];
  const repliesMap = new Map<string, typeof posts>();
  posts
    ?.filter((p) => p.parent_id)
    .forEach((p) => {
      const existing = repliesMap.get(p.parent_id!) || [];
      existing.push(p);
      repliesMap.set(p.parent_id!, existing);
    });

  const authorInitials = (name: string | null) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Back link */}
      <Link
        href="/dashboard/forum"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Forum
      </Link>

      {/* Thread header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {thread.is_pinned && (
            <Badge variant="accent" className="gap-1 text-[10px]">
              <Pin className="h-3 w-3" />
              Pinned
            </Badge>
          )}
          {thread.is_locked && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
          {thread.accepted_post_id && (
            <Badge variant="default" className="gap-1 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              Answered
            </Badge>
          )}
          {thread.category && (
            <Badge variant="outline" className="text-[10px]">
              {thread.category.name}
            </Badge>
          )}
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          {thread.title}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {thread.reply_count} replies
          </span>
          <span className="flex items-center gap-1">
            <EyeIcon className="h-3.5 w-3.5" />
            {thread.view_count} views
          </span>
        </div>
      </div>

      {/* Original post */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage
              src={thread.author?.avatar_url || undefined}
              alt={thread.author?.full_name || "User"}
            />
            <AvatarFallback className="bg-primary-600 text-white text-sm">
              {authorInitials(thread.author?.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {thread.author?.full_name || "Unknown"}
              </span>
              {thread.author?.role !== "student" && (
                <Badge variant="accent" className="text-[9px] capitalize">
                  {thread.author?.role}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {formatRelativeTime(thread.created_at)}
              </span>
            </div>
            <div className="mt-3 prose prose-sm dark:prose-invert max-w-none prose-headings:font-heading prose-a:text-accent-500">
              <div dangerouslySetInnerHTML={{ __html: thread.content }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Replies */}
      {rootPosts.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading text-lg font-semibold">
            {rootPosts.length} {rootPosts.length === 1 ? "Reply" : "Replies"}
          </h2>
          {rootPosts.map((post) => {
            const isAccepted = thread.accepted_post_id === post.id;
            const nested = repliesMap.get(post.id) || [];

            // Group reactions
            const reactionCounts = new Map<string, number>();
            post.reactions?.forEach(
              (r: { emoji: string }) =>
                reactionCounts.set(
                  r.emoji,
                  (reactionCounts.get(r.emoji) || 0) + 1
                )
            );

            return (
              <div key={post.id}>
                <Card
                  className={`p-5 ${isAccepted ? "border-accent-500 bg-accent-500/5" : ""}`}
                >
                  {isAccepted && (
                    <div className="flex items-center gap-1.5 text-accent-500 text-xs font-medium mb-3">
                      <CheckCircle2 className="h-4 w-4" />
                      Accepted Answer
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage
                        src={post.author?.avatar_url || undefined}
                        alt={post.author?.full_name || "User"}
                      />
                      <AvatarFallback className="bg-primary-600 text-white text-xs">
                        {authorInitials(post.author?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {post.author?.full_name || "Unknown"}
                        </span>
                        {post.author?.role !== "student" && (
                          <Badge
                            variant="accent"
                            className="text-[9px] capitalize"
                          >
                            {post.author?.role}
                          </Badge>
                        )}
                        {post.is_edited && (
                          <span className="text-[10px] text-muted-foreground">
                            (edited)
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatRelativeTime(post.created_at)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">{post.content}</div>

                      {/* Reactions */}
                      {reactionCounts.size > 0 && (
                        <div className="flex items-center gap-1.5 mt-3">
                          {Array.from(reactionCounts.entries()).map(
                            ([emoji, count]) => (
                              <span
                                key={emoji}
                                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                              >
                                {emoji} {count}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Nested replies */}
                {nested.length > 0 && (
                  <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-4">
                    {nested.map((reply) => (
                      <Card key={reply.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage
                              src={reply.author?.avatar_url || undefined}
                            />
                            <AvatarFallback className="bg-primary-600 text-white text-[10px]">
                              {authorInitials(reply.author?.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs">
                                {reply.author?.full_name || "Unknown"}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {formatRelativeTime(reply.created_at)}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{reply.content}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply form */}
      {!thread.is_locked && (
        <ReplyForm threadId={threadId} />
      )}

      {thread.is_locked && (
        <Card className="p-5 text-center">
          <Lock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            This thread is locked. No new replies can be posted.
          </p>
        </Card>
      )}
    </div>
  );
}
