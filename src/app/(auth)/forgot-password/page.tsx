"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type AuthState } from "../actions";

export default function ForgotPasswordPage() {
  const initialState: AuthState = {};
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
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
          Forgot password?
        </h1>
        <p className="text-muted-foreground">
          No worries. Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {/* Success message */}
      {state.success && (
        <div className="mb-6 rounded-lg bg-accent-500/10 border border-accent-500/20 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-accent-500/20 p-1 mt-0.5">
              <Check className="h-3 w-3 text-accent-500" />
            </div>
            <div className="text-sm text-accent-600 dark:text-accent-400">
              {state.success}
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10 h-11"
              autoComplete="email"
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
              <Mail className="h-4 w-4" />
              Send Reset Link
            </>
          )}
        </Button>
      </form>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-accent-500 hover:text-accent-600 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
