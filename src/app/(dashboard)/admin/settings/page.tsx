import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  Settings,
  Server,
  Clock,
  Terminal,
  ShieldCheck,
  Database,
  ScrollText,
  CreditCard,
  FileDown,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin — Settings" };

type Integration = { name: string; env: string[] };

const INTEGRATIONS: Integration[] = [
  { name: "Stripe", env: ["STRIPE_SECRET_KEY"] },
  { name: "Paystack", env: ["PAYSTACK_SECRET_KEY"] },
  { name: "Mux", env: ["MUX_TOKEN_ID", "MUX_SIGNING_KEY"] },
  { name: "Zoom", env: ["ZOOM_CLIENT_ID"] },
  { name: "YouTube", env: ["YOUTUBE_CLIENT_ID"] },
  { name: "Resend", env: ["RESEND_API_KEY"] },
  { name: "OpenAI", env: ["OPENAI_API_KEY"] },
  { name: "Upstash Redis", env: ["UPSTASH_REDIS_REST_URL"] },
  { name: "Supabase", env: ["NEXT_PUBLIC_SUPABASE_URL"] },
];

const CRON_JOBS = [
  {
    path: "/api/cron/reminders",
    purpose: "Sends 24-hour and 1-hour reminders for upcoming live sessions.",
  },
  {
    path: "/api/cron/cohort-status",
    purpose: "Advances the cohort lifecycle (draft, enrollment, active, done).",
  },
  {
    path: "/api/cron/assign-reviews",
    purpose: "Marks overdue pending review assignments as late.",
  },
  {
    path: "/api/cron/certificates",
    purpose: "Issues certificates for enrollments that meet course rules.",
  },
  {
    path: "/api/cron/reindex",
    purpose: "Rebuilds RAG chunks/embeddings for recently changed lessons.",
  },
];

function isConfigured(envVars: string[]): boolean {
  return envVars.every((name) => Boolean(process.env[name]));
}

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cronReady = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
          Platform Status
        </h1>
        <p className="text-muted-foreground mt-1">
          Read-only view of integrations, scheduled jobs and compliance tooling.
          Values are never shown, only whether they are configured.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold">Integrations</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {INTEGRATIONS.map((integration) => {
            const configured = isConfigured(integration.env);

            return (
              <Card key={integration.name} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{integration.name}</p>
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      configured ? "bg-accent-500" : "bg-destructive"
                    }`}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {configured ? "Configured" : "Missing"}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-2 break-all">
                  {integration.env.join(", ")}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-heading text-lg font-semibold">Scheduled jobs</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                cronReady ? "bg-accent-500" : "bg-destructive"
              }`}
            />
            <span className="text-muted-foreground font-mono">CRON_SECRET</span>
            <Badge variant={cronReady ? "accent" : "destructive"} className="text-[10px]">
              {cronReady ? "Configured" : "Missing"}
            </Badge>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {CRON_JOBS.map((job) => (
            <Card key={job.path} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-medium">{job.path}</p>
                <Badge
                  variant={cronReady ? "accent" : "destructive"}
                  className="text-[10px]"
                >
                  {cronReady ? "Protected" : "Rejects calls"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{job.purpose}</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-2">
                POST — requires Authorization: Bearer $CRON_SECRET
              </p>
            </Card>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Terminal className="h-4 w-4 text-accent-500" />
            <h3 className="font-heading font-semibold">Run a job locally</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Start the dev server, export <code className="font-mono text-xs">CRON_SECRET</code>{" "}
            from your <code className="font-mono text-xs">.env.local</code>, then:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs font-mono text-foreground">
            {`curl -X POST http://localhost:3000/api/cron/reminders -H "Authorization: Bearer $CRON_SECRET"`}
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            Swap the path for any of the five endpoints above. Without a matching
            secret every cron route answers 401 Unauthorized.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold">Data &amp; compliance</h2>
        </div>
        <Card className="p-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              href="/admin/audit-log"
              className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <ScrollText className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Audit log</p>
              <p className="text-xs text-muted-foreground mt-1">
                Every admin action, role change, refund and announcement send.
              </p>
            </Link>
            <Link
              href="/admin/payments"
              className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <CreditCard className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Payments</p>
              <p className="text-xs text-muted-foreground mt-1">
                Transactions, refunds and gateway receipts for disputes.
              </p>
            </Link>
            <Link
              href="/api/admin/export-data"
              className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors"
            >
              <FileDown className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-sm font-medium flex items-center gap-1">
                Export data
                <ExternalLink className="h-3 w-3" />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                POST /api/admin/export-data — admins may pass{" "}
                <code className="font-mono text-[10px]">userId</code> to export
                another account&apos;s data.
              </p>
            </Link>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            <Database className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Payments, emails and webhook handlers need a{" "}
              <code className="font-mono">.env.local</code> in the project root —
              without it those features stay disabled in every environment.
            </span>
          </div>
        </Card>
      </section>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          <Settings className="h-3.5 w-3.5 inline mr-1" />
          Secrets are never rendered here. This page only reports whether an
          environment variable is present in the server environment.
        </span>
      </div>
    </div>
  );
}
