import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  MessageSquare,
  Plus,
  Pin,
  Lock,
  Eye,
  MessageCircle,
  Clock,
  ChevronRight,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Forum" };

export default async function ForumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch user's active enrollments to get cohort IDs
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("cohort_id, cohort:cohorts (id, name, course:courses (title, slug))")
    .eq("user_id", user.id)
    .in("status", ["active", "completed"]);

  const cohortIds = enrollments?.map((e) => e.cohort_id) || [];

  // Fetch forum categories for enrolled cohorts
  const { data: categories } = cohortIds.length > 0
    ? await supabase
        .from("forum_categories")
        .select("*")
        .in("cohort_id", cohortIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const categoryIds = categories?.map((c) => c.id) || [];

  // Fetch threads for these categories
  const { data: threads } = categoryIds.length > 0
    ? await supabase
        .from("threads")
        .select(
          `
          *,
          author:profiles!threads_author_id_fkey (id, full_name, avatar_url, role),
          category:forum_categories (id, name, cohort_id)
        `
        )
        .in("category_id", categoryIds)
        .eq("is_hidden", false)
        .order("is_pinned", { ascending: false })
        .order("last_activity_at", { ascending: false })
        .limit(50)
    : { data: [] };

  // Group categories by cohort
  const cohortMap = new Map<
    string,
    {
      cohortName: string;
      courseTitle: string;
      courseSlug: string;
      categories: typeof categories;
    }
  >();

  enrollments?.forEach((e) => {
    if (e.cohort) {
      const cohort = e.cohort as unknown as {
        name?: string;
        course?: { title?: string; slug?: string };
      };
      cohortMap.set(e.cohort_id, {
        cohortName: cohort.name || "",
        courseTitle: cohort.course?.title || "",
        courseSlug: cohort.course?.slug || "",
        categories: categories?.filter((c) => c.cohort_id === e.cohort_id) || [],
      });
    }
  });

  const allThreads = threads || [];
  const pinnedThreads = allThreads.filter((t) => t.is_pinned);
  const recentThreads = allThreads.filter((t) => !t.is_pinned);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Forum
          </h1>
          <p className="text-muted-foreground mt-1">
            Discuss with your cohort peers and instructors.
          </p>
        </div>
        <Button variant="accent" className="gap-2" asChild>
          <Link href="/dashboard/forum/new">
            <Plus className="h-4 w-4" />
            New Thread
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search discussions..."
          className="pl-10 bg-muted/50 border-none"
        />
      </div>

      {cohortIds.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-1">
            No forum access
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enroll in a course to access discussion forums.
          </p>
          <Button variant="accent" asChild>
            <Link href="/courses">Browse Courses</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pinned threads */}
          {pinnedThreads.length > 0 && (
            <div>
              <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
                <Pin className="h-4 w-4 text-electric-500" />
                Pinned
              </h2>
              <div className="space-y-2">
                {pinnedThreads.map((thread) => (
                  <ThreadCard key={thread.id} thread={thread} />
                ))}
              </div>
            </div>
          )}

          {/* Recent threads */}
          <div>
            <h2 className="font-heading text-lg font-semibold mb-3">
              Recent Discussions
            </h2>
            {recentThreads.length > 0 ? (
              <div className="space-y-2">
                {recentThreads.map((thread) => (
                  <ThreadCard key={thread.id} thread={thread} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg mb-1">
                  No discussions yet
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start a conversation with your cohort.
                </p>
                <Button variant="accent" asChild>
                  <Link href="/dashboard/forum/new">Start a Thread</Link>
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Thread Card Component ──────────────────────────────────────
function ThreadCard({
  thread,
}: {
  thread: {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_locked: boolean;
    reply_count: number;
    view_count: number;
    accepted_post_id: string | null;
    last_activity_at: string;
    created_at: string;
    author?: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string;
    };
    category?: {
      id: string;
      name: string;
    };
  };
}) {
  const initials =
    thread.author?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <Link href={`/dashboard/forum/${thread.id}`}>
      <Card className="p-4 card-hover">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 mt-0.5">
            <AvatarImage
              src={thread.author?.avatar_url || undefined}
              alt={thread.author?.full_name || "User"}
            />
            <AvatarFallback className="bg-primary-600 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {thread.is_pinned && (
                <Pin className="h-3 w-3 text-electric-500 shrink-0" />
              )}
              {thread.is_locked && (
                <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              {thread.accepted_post_id && (
                <CheckCircle2 className="h-3 w-3 text-accent-500 shrink-0" />
              )}
              <h3 className="font-medium text-sm truncate">{thread.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {thread.content.replace(/[#*_~`]/g, "").slice(0, 120)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{thread.author?.full_name || "Unknown"}</span>
              {thread.author?.role !== "student" && (
                <Badge variant="outline" className="text-[9px] capitalize">
                  {thread.author?.role}
                </Badge>
              )}
              {thread.category && (
                <Badge variant="outline" className="text-[9px]">
                  {thread.category.name}
                </Badge>
              )}
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {thread.reply_count}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {thread.view_count}
              </span>
              <span className="flex items-center gap-1 ml-auto">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(thread.last_activity_at)}
              </span>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
        </div>
      </Card>
    </Link>
  );
}
