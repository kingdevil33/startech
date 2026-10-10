import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Users,
  Plus,
  Calendar,
  Clock,
  DollarSign,
  Settings,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatCurrency, percent } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage Cohorts" };

const statusColors: Record<string, string> = {
  draft: "outline",
  enrollment_open: "accent",
  enrollment_closed: "default",
  active: "electric",
  completed: "default",
  archived: "outline",
};

export default async function ManageCohortsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch cohorts for instructor's courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id")
    .eq("instructor_id", user.id);

  const courseIds = courses?.map((c) => c.id) || [];

  const { data: cohorts } = courseIds.length > 0
    ? await supabase
        .from("cohorts")
        .select("*, course:courses (title, slug)")
        .in("course_id", courseIds)
        .order("starts_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Cohorts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your course cohorts and enrollments.
          </p>
        </div>
        <Button variant="accent" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Cohort
        </Button>
      </div>

      {cohorts && cohorts.length > 0 ? (
        <div className="grid gap-4">
          {cohorts.map((cohort) => {
            const fillPercent = percent(cohort.seats_filled, cohort.capacity);

            return (
              <Card key={cohort.id} className="p-5 card-hover">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusColors[cohort.status] as "accent" | "outline" | "default" | "electric" || "outline"} className="capitalize">
                        {cohort.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {cohort.course?.title}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-lg">
                      {cohort.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(cohort.starts_at)} → {formatDate(cohort.ends_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(cohort.price, cohort.currency)}
                      </span>
                    </div>

                    {/* Capacity bar */}
                    <div className="mt-3 max-w-xs">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Enrollment
                        </span>
                        <span className="font-medium">
                          {cohort.seats_filled}/{cohort.capacity}
                        </span>
                      </div>
                      <Progress value={fillPercent} className="h-2" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Settings className="h-3.5 w-3.5" />
                      Manage
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-1">
            No cohorts yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a cohort for one of your courses to start enrolling students.
          </p>
          <Button variant="accent" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Cohort
          </Button>
        </Card>
      )}
    </div>
  );
}
