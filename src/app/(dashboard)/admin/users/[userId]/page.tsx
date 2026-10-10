import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  UserCog,
  Users,
  DollarSign,
  Award,
  Bell,
  CreditCard,
  ExternalLink,
  Power,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ActionButton } from "../../action-button";
import { toggleUserActiveAction } from "../../actions";
import { RoleCell } from "../role-cell";

export const metadata: Metadata = { title: "Admin — User Detail" };

const enrollmentStatusVariant: Record<
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

const paymentStatusVariant: Record<
  string,
  "default" | "accent" | "outline" | "destructive"
> = {
  pending: "outline",
  completed: "accent",
  failed: "destructive",
  refunded: "destructive",
  partially_refunded: "outline",
};

type Props = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, enrollmentsResult, paymentsResult, certsResult, unreadResult] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("enrollments")
        .select("id, status, created_at, cohort:cohorts (name, course:courses (title))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select(
          "id, amount, currency, status, gateway, created_at, refund_amount, refunded_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("certificates")
        .select("id, certificate_number, course_title, issued_at, is_revoked")
        .eq("user_id", userId),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
    ]);

  const profile = profileResult.data;

  if (!profile) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="py-20 text-center">
          <UserCog className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-heading text-xl font-bold tracking-tight">
            User not found
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            No profile exists for this account id.
          </p>
          <Button variant="outline" size="sm" asChild className="mt-4">
            <Link href="/admin/users">Back to users</Link>
          </Button>
        </div>
      </div>
    );
  }

  const enrollments = enrollmentsResult.data;
  const payments = paymentsResult.data;
  const certificates = certsResult.data;
  const unreadCount = unreadResult.count || 0;

  const totalSpent =
    payments
      ?.filter((p) => p.status === "completed")
      .reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  const initials =
    profile.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/users" className="hover:text-foreground transition-colors">
          Users
        </Link>
        <span>/</span>
        <span className="text-foreground">{profile.full_name || "Unnamed"}</span>
      </div>

      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary-600 text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight">
                {profile.full_name || "Unnamed"}
              </h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="capitalize text-[10px]">
                  {profile.role}
                </Badge>
                <Badge
                  variant={profile.is_active ? "accent" : "destructive"}
                  className="text-[10px]"
                >
                  {profile.is_active ? "Active" : "Inactive"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Joined {formatDate(profile.created_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start lg:items-end gap-3">
            <RoleCell userId={profile.id} role={profile.role} />
            <ActionButton
              action={toggleUserActiveAction}
              fields={{
                userId: profile.id,
                isActive: String(profile.is_active),
              }}
              variant="outline"
              size="sm"
              className="gap-1.5"
              title={profile.is_active ? "Deactivate" : "Activate"}
              confirmMessage={
                profile.is_active
                  ? `Deactivate ${profile.full_name || "this user"}?`
                  : `Reactivate ${profile.full_name || "this user"}?`
              }
              successMessage={
                profile.is_active ? "User deactivated" : "User activated"
              }
            >
              <Power className="h-4 w-4" />
              {profile.is_active ? "Deactivate" : "Activate"}
            </ActionButton>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-accent-500/10 p-2.5">
              <Users className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {enrollments?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Enrollments</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-2.5">
              <Award className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">
                {certificates?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Certificates</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2.5">
              <Bell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-heading font-bold">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Unread Notifications</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Enrollments
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-semibold text-muted-foreground">Course</th>
                <th className="pb-3 font-semibold text-muted-foreground">Cohort</th>
                <th className="pb-3 font-semibold text-muted-foreground">Status</th>
                <th className="pb-3 font-semibold text-muted-foreground">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrollments?.map((e) => {
                const cohort = Array.isArray(e.cohort) ? e.cohort[0] : e.cohort;
                const course = Array.isArray(cohort?.course)
                  ? cohort.course[0]
                  : cohort?.course;

                return (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 font-medium">
                      {course?.title || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {cohort?.name || "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={enrollmentStatusVariant[e.status] || "outline"}
                        className="capitalize text-[10px]"
                      >
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {formatDate(e.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(!enrollments || enrollments.length === 0) && (
            <div className="py-10 text-center">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No enrollments yet.
              </p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Payments
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-semibold text-muted-foreground">Amount</th>
                <th className="pb-3 font-semibold text-muted-foreground">Gateway</th>
                <th className="pb-3 font-semibold text-muted-foreground">Status</th>
                <th className="pb-3 font-semibold text-muted-foreground">Refunded</th>
                <th className="pb-3 font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments?.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4 font-heading font-bold">
                    {formatCurrency(Number(p.amount), p.currency || "GHS")}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {p.gateway}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={paymentStatusVariant[p.status] || "outline"}
                      className="capitalize text-[10px]"
                    >
                      {String(p.status).replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {Number(p.refund_amount || 0) > 0
                      ? formatCurrency(Number(p.refund_amount), p.currency || "GHS")
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!payments || payments.length === 0) && (
            <div className="py-10 text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No payments yet.</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Award className="h-4 w-4 text-muted-foreground" />
          Certificates
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-semibold text-muted-foreground">
                  Certificate #
                </th>
                <th className="pb-3 font-semibold text-muted-foreground">Course</th>
                <th className="pb-3 font-semibold text-muted-foreground">Issued</th>
                <th className="pb-3 font-semibold text-muted-foreground">Status</th>
                <th className="pb-3 font-semibold text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {certificates?.map((cert) => (
                <tr key={cert.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 pr-4">
                    <span className="font-mono text-xs font-medium">
                      {cert.certificate_number}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {cert.course_title}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDate(cert.issued_at)}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={cert.is_revoked ? "destructive" : "accent"}
                      className="text-[10px]"
                    >
                      {cert.is_revoked ? "Revoked" : "Active"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/verify/${cert.certificate_number}`}>
                          <ExternalLink className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!certificates || certificates.length === 0) && (
            <div className="py-10 text-center">
              <Award className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No certificates issued yet.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
