import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, sanitizeSearchTerm } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

export const metadata: Metadata = { title: "Admin — Audit Log" };

type Props = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function AdminAuditLogPage({ searchParams }: Props) {
  const { page: pageParam, q } = await searchParams;
  const pageSize = DEFAULT_PAGE_SIZE;

  const parsedPage = Number(pageParam);
  const page =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? Math.floor(parsedPage)
      : 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("audit_log")
    .select(`*, actor:profiles!audit_log_actor_id_fkey (full_name, email)`, {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const term = sanitizeSearchTerm(q || "");
  if (term) {
    query = query.or(
      `action.ilike.%${term}%,entity_type.ilike.%${term}%,entity_id.ilike.%${term}%`
    );
  }

  const { data: logs, count } = await query;

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return `/admin/audit-log${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">
            {total} {total === 1 ? "entry" : "entries"}
          </p>
        </div>
        <form method="get" className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Search actions..."
            className="pl-10 bg-muted/50 border-none"
          />
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">Timestamp</th>
              <th className="pb-3 font-semibold text-muted-foreground">Actor</th>
              <th className="pb-3 font-semibold text-muted-foreground">Action</th>
              <th className="pb-3 font-semibold text-muted-foreground">Entity</th>
              <th className="pb-3 font-semibold text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs?.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(entry.created_at, {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="py-3 pr-4">
                  <p className="font-medium text-xs">
                    {entry.actor?.full_name || "System"}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {entry.action}
                  </Badge>
                </td>
                <td className="py-3 pr-4">
                  {entry.entity_type && (
                    <div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {entry.entity_type}
                      </span>
                      {entry.entity_id && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                          {entry.entity_id}
                        </p>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-3">
                  {entry.details &&
                    Object.keys(entry.details).length > 0 && (
                      <pre className="text-[10px] text-muted-foreground bg-muted rounded px-2 py-1 max-w-[200px] truncate">
                        {JSON.stringify(entry.details).slice(0, 80)}
                      </pre>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div className="py-12 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No audit entries yet.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              asChild={hasPrev}
              className="gap-1"
            >
              {hasPrev ? (
                <Link href={pageHref(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <span className="gap-1 opacity-50">
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              asChild={hasNext}
              className="gap-1"
            >
              {hasNext ? (
                <Link href={pageHref(page + 1)}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="gap-1 opacity-50">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
