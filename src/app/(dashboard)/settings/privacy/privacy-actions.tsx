"use client";

import { useActionState, useState } from "react";
import { Download, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { deactivateAccountAction, type PrivacyState } from "./actions";

export function PrivacyActions() {
  const initialState: PrivacyState = {};
  const [state, formAction, isPending] = useActionState(
    deactivateAccountAction,
    initialState
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch("/api/admin/export-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `startech-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Could not export your data"
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-accent-500" />
          <h2 className="font-heading text-lg font-semibold">Export your data</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Download a JSON copy of everything we store about you: profile,
          enrollments, payments, progress, submissions, peer reviews, forum
          posts, notifications, certificates, and AI conversations.
        </p>
        {exportError && (
          <p className="text-sm text-destructive">{exportError}</p>
        )}
        <div>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download my data
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent-500" />
          <h2 className="font-heading text-lg font-semibold">How we handle data</h2>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          <li>We never store card numbers — payments run through Stripe or Paystack.</li>
          <li>AI conversations are stored so you can revisit them; content sent to the AI provider is limited to the course material being asked about.</li>
          <li>You can delete individual forum posts and AI conversations from their own pages.</li>
          <li>Full erasure (including payment records we must keep for accounting) is completed by an administrator after a deletion request.</li>
        </ul>
        <Button variant="outline" asChild>
          <a href="/privacy">Read the full privacy policy</a>
        </Button>
      </Card>

      <Card className="p-6 space-y-4 border-destructive/30">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h2 className="font-heading text-lg font-semibold text-destructive">
            Deactivate account
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Deactivating signs you out immediately and marks your profile
          inactive. Your enrollments and certificates stay intact. To erase your
          data entirely, deactivate first and then request deletion from
          support.
        </p>

        <form action={formAction} className="space-y-4">
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm
            </Label>
            <Input
              id="confirmation"
              name="confirmation"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <Separator />
          <Button
            type="submit"
            variant="destructive"
            disabled={isPending}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Deactivate my account
          </Button>
        </form>
      </Card>
    </div>
  );
}
