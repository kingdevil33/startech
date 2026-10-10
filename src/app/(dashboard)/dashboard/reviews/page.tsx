import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Peer Reviews" };

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch review assignments with submission & assignment info
  const { data: reviewAssignments } = await supabase
    .from("review_assignments")
    .select(
      `
      *,
      submission:submissions (
        id, content, file_url, link_url, status,
        assignment:assignments (id, title, is_anonymous_review, rubric, week:weeks (week_number, course_id))
      ),
      cohort:cohorts (id, name, course:courses (slug, title))
    `
    )
    .eq("reviewer_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch existing reviews by this user
  const { data: existingReviews } = await supabase
    .from("reviews")
    .select("id, review_assignment_id, overall_score, created_at")
    .eq("reviewer_id", user.id);

  const reviewByAssignment = new Map(
    existingReviews?.map((r) => [r.review_assignment_id, r]) || []
  );

  const pending =
    reviewAssignments?.filter((ra) => ra.status === "pending") || [];
  const completed =
    reviewAssignments?.filter(
      (ra) => ra.status === "completed" || ra.status === "late"
    ) || [];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Peer Reviews
        </h1>
        <p className="text-muted-foreground mt-1">
          Review your peers&apos; submissions and provide constructive feedback.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-electric-500/10 p-2.5">
              <Clock className="h-5 w-5 text-electric-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {pending.length}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {completed.length}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <ClipboardCheck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {(reviewAssignments || []).length}
              </p>
              <p className="text-xs text-muted-foreground">Total Assigned</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-accent-500/30 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-lg mb-1">
                All caught up!
              </h3>
              <p className="text-sm text-muted-foreground">
                No pending peer reviews at the moment.
              </p>
            </Card>
          ) : (
            pending.map((ra) => {
              const assignment = ra.submission?.assignment;
              const course = ra.cohort?.course;
              const isOverdue = ra.due_at && new Date(ra.due_at) < new Date();

              return (
                <Card key={ra.id} className="p-5 card-hover">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {course?.title}
                        </Badge>
                        {isOverdue && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] gap-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-heading font-semibold">
                        {assignment?.title || "Assignment Review"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {ra.cohort?.name} • Week{" "}
                        {assignment?.week?.week_number}
                      </p>
                      {ra.due_at && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {formatRelativeTime(ra.due_at)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="accent"
                      size="sm"
                      className="gap-1.5"
                      asChild
                    >
                      <Link href={`/dashboard/reviews/${ra.id}`}>
                        <Eye className="h-4 w-4" />
                        Review
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 space-y-3">
          {completed.length === 0 ? (
            <Card className="p-8 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-heading font-semibold text-lg mb-1">
                No completed reviews
              </h3>
              <p className="text-sm text-muted-foreground">
                Complete your pending reviews to see them here.
              </p>
            </Card>
          ) : (
            completed.map((ra) => {
              const assignment = ra.submission?.assignment;
              const course = ra.cohort?.course;
              const review = reviewByAssignment.get(ra.id);

              return (
                <Card key={ra.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {course?.title}
                        </Badge>
                        <Badge variant="default" className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {ra.status === "late" ? "Late" : "Completed"}
                        </Badge>
                      </div>
                      <h3 className="font-heading font-semibold">
                        {assignment?.title || "Assignment Review"}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Score given: {review?.overall_score ?? "N/A"} •
                        Completed{" "}
                        {ra.completed_at
                          ? formatRelativeTime(ra.completed_at)
                          : ""}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      asChild
                    >
                      <Link href={`/dashboard/reviews/${ra.id}`}>
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
