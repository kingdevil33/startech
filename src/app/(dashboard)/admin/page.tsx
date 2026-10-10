import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  GraduationCap,
  CreditCard,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Aggregate stats
  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { count: totalCourses } = await supabase
    .from("courses")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  const { count: activeEnrollments } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const { count: totalCertificates } = await supabase
    .from("certificates")
    .select("id", { count: "exact", head: true });

  // Recent payments
  const { data: recentPayments } = await supabase
    .from("payments")
    .select(
      `*, 
      user:profiles!payments_user_id_fkey (full_name, email),
      cohort:cohorts (name, course:courses (title))`
    )
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  // Total revenue
  const { data: revenueData } = await supabase
    .from("payments")
    .select("amount, currency")
    .eq("status", "completed");

  const totalRevenue =
    revenueData?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  // Recent signups
  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent audit entries
  const { data: recentAudit } = await supabase
    .from("audit_log")
    .select("*, actor:profiles!audit_log_actor_id_fkey (full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          System overview and key metrics.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{totalUsers || 0}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-electric-500/10 p-2.5">
              <BookOpen className="h-5 w-5 text-electric-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{totalCourses || 0}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <GraduationCap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{activeEnrollments || 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-2.5">
              <Award className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{totalCertificates || 0}</p>
              <p className="text-xs text-muted-foreground">Certificates</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card className="p-5">
          <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Recent Payments
          </h2>
          <div className="space-y-3">
            {recentPayments?.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {payment.user?.full_name || payment.user?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.cohort?.course?.title} • {payment.cohort?.name}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-heading font-bold text-accent-500">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(payment.created_at)}
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payments yet
              </p>
            )}
          </div>
        </Card>

        {/* Recent Users */}
        <Card className="p-5">
          <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Recent Signups
          </h2>
          <div className="space-y-3">
            {recentUsers?.map((u) => (
              <div key={u.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.full_name || "Unnamed"}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {u.role}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(u.created_at)}
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users yet
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Audit Log */}
      <Card className="p-5">
        <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </h2>
        <div className="space-y-2">
          {recentAudit?.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
            >
              <div className="h-2 w-2 rounded-full bg-accent-500 shrink-0" />
              <span className="font-medium">
                {entry.actor?.full_name || "System"}
              </span>
              <span className="text-muted-foreground">{entry.action}</span>
              {entry.entity_type && (
                <Badge variant="outline" className="text-[9px]">
                  {entry.entity_type}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {formatRelativeTime(entry.created_at)}
              </span>
            </div>
          )) || (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activity yet
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
