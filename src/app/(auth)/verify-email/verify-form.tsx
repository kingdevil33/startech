"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationAction, type AuthState } from "../actions";

export function VerifyForm() {
  const initialState: AuthState = {};
  const [state, formAction, isPending] = useActionState(
    resendVerificationAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-accent-600 dark:text-accent-400">
          {state.success}
        </p>
      )}

      <Button
        type="submit"
        variant="gradient"
        className="w-full h-11"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4" />
            Resend verification email
          </>
        )}
      </Button>
    </form>
  );
}
