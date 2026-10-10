import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  CreditCard,
  Search,
  DollarSign,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatDate, formatCurrency, sanitizeSearchTerm } from "@/lib/utils";
import { ActionButton } from "../action-button";
import { refundPaymentAction } from "../actions";

export const metadata: Metadata = { title: "Admin — Payments" };

const statusVariant: Record<
  string,
  "default" | "accent" | "outline" | "destructive"
> = {
  pending: "outline",
  completed: "accent",
  failed: "destructive",
  refunded: "destructive",
  partially_refunded: "outline",
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Stats
  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount, currency, status");

  const totalRevenue =
    allPayments
      ?.filter((p) => p.status === "completed")
      .reduce((acc, p) => acc + Number(p.amount), 0) || 0;
  const totalRefunded =
    allPayments
      ?.filter(
        (p) => p.status === "refunded" || p.status === "partially_refunded"
      )
      .reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  // Paginated list
  let listQuery = supabase
    .from("payments")
    .select(
      `*, 
      user:profiles!payments_user_id_fkey (full_name, email),
      cohort:cohorts (name, course:courses (title))`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const term = sanitizeSearchTerm(q || "");
  if (term) {
    listQuery = listQuery.or(
      `gateway_session_id.ilike.%${term}%,coupon_code.ilike.%${term}%`
    );
  }

  const { data: payments, count } = await listQuery;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Payments
        </h1>
        <form method="get" className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q || ""}
            placeholder="Search reference / coupon..."
            className="pl-10 bg-muted/50 border-none"
          />
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-destructive/10 p-2.5">
              <RotateCcw className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(totalRefunded)}
              </p>
              <p className="text-xs text-muted-foreground">Refunded</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{count || 0}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">Student</th>
              <th className="pb-3 font-semibold text-muted-foreground">Course</th>
              <th className="pb-3 font-semibold text-muted-foreground">Amount</th>
              <th className="pb-3 font-semibold text-muted-foreground">Gateway</th>
              <th className="pb-3 font-semibold text-muted-foreground">Status</th>
              <th className="pb-3 font-semibold text-muted-foreground">Date</th>
              <th className="pb-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments?.map((p) => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium">{p.user?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.user?.email}</p>
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {p.cohort?.course?.title}
                </td>
                <td className="py-3 pr-4 font-heading font-bold">
                  {formatCurrency(p.amount, p.currency)}
                  {p.coupon_code && (
                    <span className="text-[10px] text-accent-500 ml-1">
                      ({p.coupon_code})
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {p.gateway}
                  </Badge>
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={statusVariant[p.status] || "outline"} className="capitalize text-[10px]">
                    {p.status}
                  </Badge>
                </td>
                <td className="py-3 pr-4 text-xs text-muted-foreground">
                  {formatDate(p.created_at)}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {p.gateway_receipt_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={p.gateway_receipt_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {p.status === "completed" &&
                      (p.gateway === "stripe" || p.gateway === "paystack") && (
                        <ActionButton
                          action={refundPaymentAction}
                          fields={{ paymentId: p.id }}
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-destructive hover:text-destructive"
                          title="Refund this payment"
                          confirmMessage={`Refund ${formatCurrency(p.amount, p.currency)} to ${p.user?.full_name || "this student"}?`}
                          successMessage="Refund processed"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Refund
                        </ActionButton>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!payments || payments.length === 0) && (
          <div className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No payments found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
