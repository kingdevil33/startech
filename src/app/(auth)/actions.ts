"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notifyWelcome } from "@/lib/email/notify";
import { authRateLimit, checkRateLimit, clientIp } from "@/lib/rate-limit";

export type AuthState = {
  error?: string;
  success?: string;
};

const RATE_LIMIT_ERROR = "Too many attempts. Please wait a minute and try again.";

// ─── LOGIN ───────────────────────────────────────────────────────
export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirect") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const ip = await clientIp();
  const limit = await checkRateLimit(authRateLimit, `auth:login:${ip}`);
  if (!limit.success) {
    return { error: RATE_LIMIT_ERROR };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo || "/dashboard");
}

// ─── SIGNUP ──────────────────────────────────────────────────────
export async function signupAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const ip = await clientIp();
  const limit = await checkRateLimit(authRateLimit, `auth:signup:${ip}`);
  if (!limit.success) {
    return { error: RATE_LIMIT_ERROR };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  void notifyWelcome(email, fullName);

  // No session back means Supabase is waiting for email confirmation.
  if (!data.session) {
    redirect("/verify-email");
  }

  redirect("/dashboard");
}

// ─── RESEND VERIFICATION ─────────────────────────────────────────
export async function resendVerificationAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  const ip = await clientIp();
  const limit = await checkRateLimit(
    authRateLimit,
    `auth:resend:${ip}`
  );
  if (!limit.success) {
    return { error: RATE_LIMIT_ERROR };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Verification email sent. Check your inbox (and spam folder).",
  };
}

// ─── FORGOT PASSWORD ─────────────────────────────────────────────
export async function forgotPasswordAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  const ip = await clientIp();
  const limit = await checkRateLimit(
    authRateLimit,
    `auth:forgot:${ip}`
  );
  if (!limit.success) {
    return { error: RATE_LIMIT_ERROR };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "If an account exists with this email, you'll receive a reset link.",
  };
}

// ─── RESET PASSWORD ─────────────────────────────────────────────
export async function resetPasswordAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password) {
    return { error: "Password is required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?message=Password updated successfully. Please log in.");
}

// ─── LOGOUT ──────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─── OAUTH ───────────────────────────────────────────────────────
export async function oauthAction(
  provider: "google" | "github"
): Promise<AuthState> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { error: "Failed to initiate OAuth." };
}
