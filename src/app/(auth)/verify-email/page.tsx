import Link from "next/link";
import type { Metadata } from "next";
import { Mail, Inbox, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Verify your email",
};

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-500/10 text-accent-500">
          <Inbox className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-2">
          Check your email
        </h1>
        <p className="text-muted-foreground">
          We sent a verification link to your inbox. Click it to activate your
          account, then come back here.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="flex items-start gap-2.5">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
            The link expires shortly — request a new one if it has lapsed.
          </p>
          <p className="flex items-start gap-2.5">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
            Nothing after a few minutes? Check your spam folder or resend below.
          </p>
        </div>

        <VerifyForm />

        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <Button variant="ghost" className="justify-start px-0 h-auto text-sm" asChild>
            <Link href="/login">
              <ArrowRight className="h-4 w-4" />
              I already verified — sign in
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start px-0 h-auto text-sm" asChild>
            <Link href="/signup">
              <ArrowRight className="h-4 w-4" />
              Use a different email
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
