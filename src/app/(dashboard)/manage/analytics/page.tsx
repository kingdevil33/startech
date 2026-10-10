import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, percent } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch instructor's courses
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("instructor_id", user.id);

  const courseIds = courses?.map((c) => c.id) || [];

  // Fetch cohorts
  const { data: cohorts } = courseIds.length > 0
    ? await supabase
        .from("cohorts")
        .select("id, name, course_id, capacity, seats_filled, price, currency, status")
        .in("course_id", courseIds)
    : { data: [] };

  // Calculate stats
  const totalStudents = cohorts?.reduce((acc, c) => acc + c.seats_filled, 0) || 0;
  const activeCohorts = cohorts?.filter((c) => c.status === "active" || c.status === "enrollment_open").length || 0;
  const totalRevenue = cohorts?.reduce((acc, c) => acc + c.price * c.seats_filled, 0) || 0;

  // Fetch submission stats
  const cohortIds = cohorts?.map((c) => c.id) || [];
  const { count: totalSubmissions } = cohortIds.length > 0
    ? await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .in("cohort_id", cohortIds)
    : { count: 0 };

  const { count: gradedSubmissions } = cohortIds.length > 0
    ? await supabase
        .from("submissions")
        .select("id", { count: "exact", head: true })
        .in("cohort_id", cohortIds)
        .eq("status", "graded")
    : { count: 0 };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your teaching performance.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-electric-500/10 p-2.5">
              <BookOpen className="h-5 w-5 text-electric-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{activeCohorts}</p>
              <p className="text-xs text-muted-foreground">Active Cohorts</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {gradedSubmissions || 0}/{totalSubmissions || 0}
              </p>
              <p className="text-xs text-muted-foreground">Graded</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-cohort breakdown */}
      <div>
        <h2 className="font-heading text-xl font-semibold mb-4">
          Cohort Performance
        </h2>
        <div className="space-y-3">
          {cohorts?.map((cohort) => {
            const courseName = courses?.find((c) => c.id === cohort.course_id)?.title || "";
            const fillPercent = percent(cohort.seats_filled, cohort.capacity);

            return (
              <Card key={cohort.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {courseName}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {cohort.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <h3 className="font-heading font-semibold">{cohort.name}</h3>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {cohort.seats_filled}/{cohort.capacity} enrolled
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(
                          cohort.price * cohort.seats_filled,
                          cohort.currency
                        )} revenue
                      </span>
                    </div>
                  </div>
                  <div className="w-32 shrink-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Fill rate</span>
                      <span className="font-medium">{fillPercent}%</span>
                    </div>
                    <Progress value={fillPercent} className="h-2" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
