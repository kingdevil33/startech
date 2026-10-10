import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Megaphone, Bell, Users, Mail, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnnouncementForm } from "./announcement-form";

export const metadata: Metadata = { title: "Admin — Announcements" };

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Announcements
        </h1>
        <p className="text-muted-foreground mt-1">
          Broadcast an in-app notification to every active user in a selected
          audience.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Megaphone className="h-5 w-5 text-accent-500" />
          <h2 className="font-heading text-lg font-semibold">New announcement</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Announcements are delivered instantly to the in-app bell. Up to 500
          recipients per send, active accounts only.
        </p>
        <AnnouncementForm />
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          <h2 className="font-heading text-lg font-semibold">
            What students see
          </h2>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-start gap-3">
          <div className="rounded-full bg-accent-500/15 p-2">
            <Bell className="h-4 w-4 text-accent-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              Your announcement title
            </p>
            <p className="text-xs text-muted-foreground">
              The message body you write shows up right here in the notification
              preview.
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">just now</p>
          </div>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
            Shows up in the header bell with an unread count.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
            <span>
              Listed under{" "}
              <Link
                href="/notifications"
                className="inline-flex items-center gap-0.5 text-accent-500 hover:underline"
              >
                /notifications
                <ArrowUpRight className="h-3 w-3" />
              </Link>{" "}
              as an announcement, linking back to the same page.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
            Sent only to active accounts in the chosen audience (students,
            instructors &amp; TAs, or everyone).
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
            <span className="inline-flex items-center gap-1">
              In-app only.
              <Mail className="h-3.5 w-3.5" /> No email is sent, so inboxes stay
              untouched.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
            Every send is audit-logged with the audience and recipient count.
          </li>
        </ul>

        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-blue-500">
          <Users className="h-4 w-4 shrink-0" />
          Recipients are capped at 500 per broadcast — split larger audiences
          across multiple sends if needed.
        </div>
      </Card>
    </div>
  );
}
