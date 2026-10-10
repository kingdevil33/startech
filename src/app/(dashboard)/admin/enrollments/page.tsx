import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin — Enrollments" };

const statusVariant: Record<
  string,
  "default" | "accent" | "outline" | "destructive"
> = {
  reserved: "outline",
  active: "accent",
  completed: "default",
  dropped: "destructive",
  refunded: "destructive",
  expired: "outline",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "reserved", label: "Reserved" },
  { value: "completed", label: "Completed" },
  { value: "dropped", label: "Dropped" },
  { value: "refunded", label: "Refunded" },
  { value: "expired", label: "Expired" },
];

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminEnrollmentsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("enrollments")
    .select(
      `*, 
      user:profiles!enrollments_user_id_fkey (full_name, email),
      cohort:cohorts (name, course:courses (title))`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && FILTERS.some((f) => f.value === status)) {
    query = query.eq("status", status);
  }

  const { data: enrollments, count } = await query;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Enrollments
          </h1>
          <p className="text-muted-foreground mt-1">{count || 0} total</p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const href = f.value
            ? `/admin/enrollments?status=${f.value}`
            : "/admin/enrollments";
          const isActive = (status || "") === f.value;

          return (
            <Link
              key={f.value || "all"}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "border-transparent bg-primary-600 text-white"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">Student</th>
              <th className="pb-3 font-semibold text-muted-foreground">Course</th>
              <th className="pb-3 font-semibold text-muted-foreground">Cohort</th>
              <th className="pb-3 font-semibold text-muted-foreground">Status</th>
              <th className="pb-3 font-semibold text-muted-foreground">Enrolled</th>
              <th className="pb-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {enrollments?.map((e) => (
              <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium">{e.user?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{e.user?.email}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {e.cohort?.course?.title || "—"}
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {e.cohort?.name || "—"}
                </td>
                <td className="py-3 pr-4">
                  <Badge
                    variant={statusVariant[e.status] || "outline"}
                    className="capitalize text-[10px]"
                  >
                    {e.status}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {formatDate(e.created_at)}
                </td>
                <td className="py-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!enrollments || enrollments.length === 0) && (
          <div className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No enrollments match this filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
