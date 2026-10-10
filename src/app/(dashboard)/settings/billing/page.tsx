import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CreditCard, ExternalLink, Receipt, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SettingsNav } from "../nav";

export const metadata: Metadata = { title: "Billing Settings" };

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

export default async function BillingSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: payments }, { data: profile }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        `id, amount, currency, status, gateway, gateway_receipt_url, coupon_code,
         created_at, refunded_at, refund_amount,
         cohort:cohorts (name, course:courses (title))`
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  const totalPaid =
    payments
      ?.filter((p) => p.status === "completed" || p.status === "refunded")
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalRefunded =
    payments
      ?.filter((p) => p.status === "refunded" || p.status === "partially_refunded")
      .reduce((sum, p) => sum + Number(p.refund_amount ?? p.amount), 0) || 0;

  const rows = (payments ?? []).map((p) => {
    const cohort = Array.isArray(p.cohort)
      ? (p.cohort as unknown as { name?: string }[])[0]
      : (p.cohort as unknown as { name?: string } | null);
    const course = cohort
      ? Array.isArray(
          (cohort as unknown as { course?: unknown }).course
        )
        ? (((cohort as unknown as { course: unknown[] }).course)[0] as {
            title?: string;
          })
        : ((cohort as unknown as { course?: { title?: string } }).course ??
          null)
      : null;
    return { ...p, cohortName: cohort?.name ?? null, courseTitle: course?.title ?? null };
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Payment history, receipts, and refunds for {profile?.full_name || "your account"}.
        </p>
      </div>

      <SettingsNav />

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <Wallet className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(totalPaid, payments?.[0]?.currency || "GHS")}
              </p>
              <p className="text-xs text-muted-foreground">Total paid</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-destructive/10 p-2.5">
              <Receipt className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(totalRefunded, payments?.[0]?.currency || "GHS")}
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
              <p className="text-xl font-heading font-bold">
                {payments?.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Transactions</h2>
          <Badge variant="outline" className="gap-1.5 text-[11px]">
            <ShieldCheck className="h-3 w-3" />
            Processed by Stripe &amp; Paystack
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-semibold text-muted-foreground">Item</th>
                <th className="pb-3 font-semibold text-muted-foreground">Amount</th>
                <th className="pb-3 font-semibold text-muted-foreground">Status</th>
                <th className="pb-3 font-semibold text-muted-foreground">Date</th>
                <th className="pb-3 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{p.courseTitle || "Enrollment"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.cohortName}
                      {p.coupon_code ? ` · ${p.coupon_code}` : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-4 font-heading font-bold">
                    {formatCurrency(p.amount, p.currency)}
                    {Boolean(p.refund_amount) && (
                      <span className="block text-[10px] font-normal text-destructive">
                        refunded {formatCurrency(Number(p.refund_amount), p.currency)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={statusVariant[p.status] || "outline"}
                      className="capitalize text-[10px]"
                    >
                      {p.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </td>
                  <td className="py-3 text-right">
                    {p.gateway_receipt_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={p.gateway_receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Receipt
                        </a>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No payments yet. Enroll in a cohort to see receipts here.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
