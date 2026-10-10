"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction, type AuthState } from "../actions";

export default function ResetPasswordPage() {
  const initialState: AuthState = {};
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState
  );

  return (
    <div className="animate-fade-up">
      {/* Back link */}
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight mb-2">
          Set new password
        </h1>
        <p className="text-muted-foreground">
          Enter your new password below.
        </p>
      </div>

      {/* Error message */}
      {state.error && (
        <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="pl-10 h-11"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters with uppercase, lowercase, and a
            number.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="pl-10 h-11"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

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
              <Lock className="h-4 w-4" />
              Update Password
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
