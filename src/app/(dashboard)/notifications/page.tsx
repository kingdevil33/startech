import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Bell,
  Check,
  CheckCheck,
  BookOpen,
  Calendar,
  MessageSquare,
  Award,
  CreditCard,
  ClipboardCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { markNotificationsReadAction } from "./actions";

export const metadata: Metadata = {
  title: "Notifications",
};

const iconMap: Record<string, React.ElementType> = {
  enrollment_confirmed: BookOpen,
  session_reminder: Calendar,
  assignment_due: ClipboardCheck,
  review_assigned: ClipboardCheck,
  forum_reply: MessageSquare,
  forum_mention: MessageSquare,
  certificate_issued: Award,
  announcement: Bell,
  refund_processed: CreditCard,
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unreadCount =
    notifications?.filter((n) => !n.is_read).length || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markNotificationsReadAction}>
            <Button variant="outline" size="sm" type="submit">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {/* Notifications list */}
      {notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = iconMap[notif.type] || Info;

            return (
              <Card
                key={notif.id}
                className={`p-4 transition-colors ${
                  !notif.is_read
                    ? "border-accent-500/30 bg-accent-500/5"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-2 shrink-0 ${
                      !notif.is_read
                        ? "bg-accent-500/10"
                        : "bg-muted"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${
                        !notif.is_read
                          ? "text-accent-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm leading-tight ${
                          !notif.is_read ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <div className="h-2 w-2 rounded-full bg-accent-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notif.body && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatRelativeTime(notif.created_at)}
                    </p>
                  </div>
                </div>
                {notif.link && (
                  <div className="mt-3 pl-11">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={notif.link}>
                        View details
                      </Link>
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-1">
            No notifications yet
          </h3>
          <p className="text-sm text-muted-foreground">
            You&apos;ll be notified about course updates, sessions, and more.
          </p>
        </Card>
      )}
    </div>
  );
}
