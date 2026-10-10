"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-2xl bg-red-500/10 p-5">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <div>
        <h2 className="font-heading text-2xl font-bold mb-2">
          Something went wrong
        </h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. Please try again or contact support if
          the problem persists.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
