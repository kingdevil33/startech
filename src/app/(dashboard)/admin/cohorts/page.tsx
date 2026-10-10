import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Users, UserPlus, Activity, Wallet, Search, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatDate,
  formatCurrency,
  sanitizeSearchTerm,
  percent,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Admin — Cohorts" };

const statusVariant: Record<
  string,
  "default" | "accent" | "outline" | "destructive"
> = {
  draft: "outline",
  enrollment_open: "accent",
  enrollment_closed: "default",
  active: "default",
  completed: "outline",
  archived: "outline",
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminCohortsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count: totalCohorts } = await supabase
    .from("cohorts")
    .select("id", { count: "exact", head: true });

  const { count: openCohorts } = await supabase
    .from("cohorts")
    .select("id", { count: "exact", head: true })
    .eq("status", "enrollment_open");

  const { count: activeCohorts } = await supabase
    .from("cohorts")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const { data: seatRows } = await supabase.from("cohorts").select("seats_filled");
  const seatsFilled =
    seatRows?.reduce((acc, row) => acc + Number(row.seats_filled || 0), 0) || 0;

  let listQuery = supabase
    .from("cohorts")
    .select(
      `id, name, slug, status, price, currency, capacity, seats_filled,
      enrollment_opens_at, enrollment_closes_at, starts_at, ends_at, timezone,
      created_at, course:courses (title, slug)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const term = sanitizeSearchTerm(q || "");
  if (term) {
    listQuery = listQuery.ilike("name", `%${term}%`);
  }

  const { data: cohorts, count } = await listQuery;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Cohorts
          </h1>
          <p className="text-muted-foreground mt-1">{count || 0} cohorts</p>
        </div>
        <form method="get" className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Search cohorts..."
            className="pl-10 bg-muted/50 border-none"
          />
        </form>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{totalCohorts || 0}</p>
              <p className="text-xs text-muted-foreground">Total Cohorts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <UserPlus className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{openCohorts || 0}</p>
              <p className="text-xs text-muted-foreground">Enrollment Open</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-electric-500/10 p-2.5">
              <Activity className="h-5 w-5 text-electric-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{activeCohorts || 0}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <Wallet className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{seatsFilled}</p>
              <p className="text-xs text-muted-foreground">Seats Filled</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">Course</th>
              <th className="pb-3 font-semibold text-muted-foreground">Cohort</th>
              <th className="pb-3 font-semibold text-muted-foreground">Status</th>
              <th className="pb-3 font-semibold text-muted-foreground">Seats</th>
              <th className="pb-3 font-semibold text-muted-foreground">Price</th>
              <th className="pb-3 font-semibold text-muted-foreground">Starts</th>
              <th className="pb-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cohorts?.map((c) => {
              const course = Array.isArray(c.course) ? c.course[0] : c.course;
              const filled = Number(c.seats_filled || 0);
              const capacity = Number(c.capacity || 0);
              const fillPercent = percent(filled, capacity);

              return (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{course?.title || "—"}</p>
                    <p className="text-xs text-muted-foreground">{course?.slug}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p>{c.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.slug}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={statusVariant[c.status] || "outline"}
                      className="capitalize text-[10px]"
                    >
                      {String(c.status).replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 min-w-[160px]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-heading font-bold">
                        {filled}/{capacity}
                      </span>
                      <span className="text-muted-foreground">{fillPercent}%</span>
                    </div>
                    <Progress value={fillPercent} className="h-1.5" />
                  </td>
                  <td className="py-3 pr-4 font-heading font-bold">
                    {formatCurrency(Number(c.price || 0), c.currency || "GHS")}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {c.starts_at ? formatDate(c.starts_at) : "—"}
                    {c.timezone && <p className="text-[10px]">{c.timezone}</p>}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="outline" size="sm" asChild className="gap-1">
                        <Link href={`/manage/cohorts/${c.id}`}>
                          Manage
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!cohorts || cohorts.length === 0) && (
          <div className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No cohorts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
