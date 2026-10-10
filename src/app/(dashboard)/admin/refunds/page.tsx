import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  RotateCcw,
  Search,
  Info,
  CreditCard,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatDate, formatCurrency, sanitizeSearchTerm } from "@/lib/utils";
import { ActionButton } from "../action-button";
import { refundPaymentAction } from "../actions";

export const metadata: Metadata = { title: "Admin — Refunds" };

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

const REFUNDABLE_STATUSES = ["completed", "refunded", "partially_refunded"];

type Props = { searchParams: Promise<{ q?: string }> };

export default async function AdminRefundsPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: statRows } = await supabase
    .from("payments")
    .select("amount, status, refund_amount")
    .in("status", REFUNDABLE_STATUSES);

  const refundedRows =
    statRows?.filter(
      (p) => p.status === "refunded" || p.status === "partially_refunded"
    ) || [];

  const totalRefunded = refundedRows.reduce(
    (acc, p) => acc + Number(p.refund_amount || 0),
    0
  );
  const refundableAmount =
    statRows
      ?.filter((p) => p.status === "completed")
      .reduce((acc, p) => acc + Number(p.amount), 0) || 0;
  const refundCount = refundedRows.length;

  let listQuery = supabase
    .from("payments")
    .select(
      `id, amount, currency, status, gateway, refund_amount, refunded_at,
      created_at, gateway_receipt_url,
      user:profiles!payments_user_id_fkey (full_name, email),
      cohort:cohorts (name)`,
      { count: "exact" }
    )
    .in("status", REFUNDABLE_STATUSES)
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
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Refunds
          </h1>
          <p className="text-muted-foreground mt-1">{count || 0} payments in queue</p>
        </div>
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

      <Card className="p-4 border-accent-500/20 bg-accent-500/10">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-accent-600 dark:text-accent-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">How refunds work</p>
            <p className="text-muted-foreground mt-1">
              Refunds run through Stripe or Paystack and take 5-10 business days
              to appear on the student&apos;s statement. Paid students are also
              unenrolled automatically (enrollment status becomes
              &quot;refunded&quot;) when a refund is processed.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-destructive/10 p-2.5">
              <RotateCcw className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(totalRefunded)}
              </p>
              <p className="text-xs text-muted-foreground">Total Refunded</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <Wallet className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(refundableAmount)}
              </p>
              <p className="text-xs text-muted-foreground">Refundable Amount</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{refundCount}</p>
              <p className="text-xs text-muted-foreground">Refunds Issued</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-semibold text-muted-foreground">Student</th>
              <th className="pb-3 font-semibold text-muted-foreground">Cohort</th>
              <th className="pb-3 font-semibold text-muted-foreground">Amount</th>
              <th className="pb-3 font-semibold text-muted-foreground">Refunded</th>
              <th className="pb-3 font-semibold text-muted-foreground">Status</th>
              <th className="pb-3 font-semibold text-muted-foreground">Gateway</th>
              <th className="pb-3 font-semibold text-muted-foreground">Date</th>
              <th className="pb-3 font-semibold text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments?.map((p) => {
              const student = Array.isArray(p.user) ? p.user[0] : p.user;
              const cohort = Array.isArray(p.cohort) ? p.cohort[0] : p.cohort;
              const refunded = Number(p.refund_amount || 0);

              return (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{student?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{student?.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {cohort?.name || "—"}
                  </td>
                  <td className="py-3 pr-4 font-heading font-bold">
                    {formatCurrency(Number(p.amount), p.currency || "GHS")}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {refunded > 0
                      ? formatCurrency(refunded, p.currency || "GHS")
                      : "—"}
                    {p.refunded_at && refunded > 0 && (
                      <p className="text-[10px]">{formatDate(p.refunded_at)}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={statusVariant[p.status] || "outline"}
                      className="capitalize text-[10px]"
                    >
                      {String(p.status).replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {p.gateway}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.gateway_receipt_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={p.gateway_receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
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
                            confirmMessage={`Refund ${formatCurrency(Number(p.amount), p.currency || "GHS")} to ${student?.full_name || "this student"}?`}
                            successMessage="Refund processed"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Refund
                          </ActionButton>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(!payments || payments.length === 0) && (
          <div className="py-12 text-center">
            <RotateCcw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No refundable payments.</p>
          </div>
        )}
      </div>
    </div>
  );
}
