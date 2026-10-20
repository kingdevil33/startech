import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SIGNATURE_TOLERANCE_SECONDS = 300;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function parseSignatureHeader(header: string): {
  timestamp: string | null;
  signatures: string[];
} {
  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  return { timestamp, signatures };
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyStripeSignature(
  body: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  if (!header || !secret) return false;

  const { timestamp, signatures } = parseSignatureHeader(header);
  if (!timestamp || signatures.length === 0) return false;

  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp)) return false;
  if (Math.abs(nowSeconds - parsedTimestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = await hmacSha256Hex(secret, `${timestamp}.${body}`);
  return signatures.some((candidate) => timingSafeEqual(candidate, expected));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") || "noreply@startech.com",
        to: [to],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.error(
      "Email send failed:",
      err instanceof Error ? err.message : "unknown"
    );
  }
}

async function resolveEnrollmentContext(
  admin: SupabaseClient,
  enrollmentId: string
): Promise<{ email: string | null; courseTitle: string } | null> {
  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id, user_id, cohort_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return null;

  const [{ data: profile }, { data: cohort }] = await Promise.all([
    admin
      .from("profiles")
      .select("email, full_name")
      .eq("id", enrollment.user_id)
      .maybeSingle(),
    admin
      .from("cohorts")
      .select("name, course:courses (title)")
      .eq("id", enrollment.cohort_id)
      .maybeSingle(),
  ]);

  const course = Array.isArray(cohort?.course)
    ? (cohort?.course as unknown as { title?: string }[])[0]
    : (cohort?.course as unknown as { title?: string } | null);

  return {
    email: profile?.email ?? null,
    courseTitle: course?.title ?? "your course",
  };
}

type StripeSession = {
  id: string;
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | null;
  metadata?: Record<string, string | undefined> | null;
};

type StripeCharge = {
  payment_intent?: string | null;
  amount_refunded?: number;
  currency?: string | null;
};

type StripeEvent = {
  type: string;
  data: { object: unknown };
};

export default async function handler(req: Request): Promise<Response> {
  const { headers, preflight } = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  }

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    return jsonResponse(
      { error: "Webhook secret not configured" },
      500,
      headers
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  const valid = await verifyStripeSignature(body, signature, secret);
  if (!valid) {
    return jsonResponse({ error: "Invalid signature" }, 400, headers);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(body) as StripeEvent;
  } catch {
    return jsonResponse({ error: "Invalid payload" }, 400, headers);
  }

  const admin = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as StripeSession;
      const metadata = session.metadata ?? {};

      if (!metadata.enrollment_id) break;

      // Idempotency: Stripe retries and duplicate endpoint deliveries must
      // not re-send notifications/emails for an already-activated enrollment.
      const { data: enrollment } = await admin
        .from("enrollments")
        .select("id, status")
        .eq("id", metadata.enrollment_id)
        .maybeSingle();

      const alreadyActive = enrollment?.status === "active";

      await admin
        .from("enrollments")
        .update({
          status: "active",
          reserved_until: null,
        })
        .eq("id", metadata.enrollment_id);

      await admin.from("payments").upsert(
        {
          enrollment_id: metadata.enrollment_id,
          user_id: metadata.user_id,
          cohort_id: metadata.cohort_id,
          amount: (session.amount_total || 0) / 100,
          currency: session.currency || "usd",
          gateway: "stripe",
          status: "completed",
          gateway_session_id: session.id,
          gateway_payment_id: session.payment_intent as string,
          gateway_receipt_url: null,
          coupon_code: metadata.coupon_code || null,
          discount_amount: Number(metadata.discount_amount) || 0,
        },
        { onConflict: "enrollment_id,gateway" }
      );

      if (alreadyActive) break;

      await admin.rpc("create_notification", {
        p_user_id: metadata.user_id,
        p_type: "enrollment_confirmed",
        p_title: "Enrollment Confirmed!",
        p_body: "Your payment was successful. Welcome to the course!",
        p_link: `/dashboard`,
        p_cohort_id: metadata.cohort_id,
      });

      await admin.rpc("log_audit", {
        p_actor_id: metadata.user_id,
        p_action: "enrollment.activated",
        p_entity_type: "enrollment",
        p_entity_id: metadata.enrollment_id,
        p_details: {
          gateway: "stripe",
          amount: (session.amount_total || 0) / 100,
        },
      });

      try {
        const context = await resolveEnrollmentContext(
          admin,
          metadata.enrollment_id
        );
        if (context?.email) {
          await sendEmail(
            context.email,
            `Enrollment confirmed — ${context.courseTitle}`,
            `<!doctype html><html><body style="font-family:sans-serif">
<p>Your payment was successful. Welcome to <strong>${escapeHtml(
              context.courseTitle
            )}</strong>!</p>
<p>Amount: ${((session.amount_total || 0) / 100).toFixed(2)} ${escapeHtml(
              (session.currency || "usd").toUpperCase()
            )}</p>
</body></html>`
          );
        }
      } catch (err) {
        console.error(
          "Enrollment confirmation email failed:",
          err instanceof Error ? err.message : "unknown"
        );
      }

      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as StripeCharge;
      const paymentIntentId = charge.payment_intent;

      if (paymentIntentId) {
        const refundAmount = (charge.amount_refunded || 0) / 100;

        const { data: payment } = await admin
          .from("payments")
          .select("id, enrollment_id, user_id, status")
          .eq("gateway_payment_id", paymentIntentId)
          .maybeSingle();

        const alreadyRefunded = payment?.status === "refunded";

        await admin
          .from("payments")
          .update({
            status: "refunded",
            refund_amount: refundAmount,
            refunded_at: new Date().toISOString(),
          })
          .eq("gateway_payment_id", paymentIntentId);

        if (payment && !alreadyRefunded) {
          await admin
            .from("enrollments")
            .update({ status: "refunded" })
            .eq("id", payment.enrollment_id);

          await admin.rpc("create_notification", {
            p_user_id: payment.user_id,
            p_type: "refund_processed",
            p_title: "Refund Processed",
            p_body: `Your refund of $${refundAmount.toFixed(2)} has been processed.`,
          });

          try {
            const { data: profile } = await admin
              .from("profiles")
              .select("email")
              .eq("id", payment.user_id)
              .maybeSingle();

            if (profile?.email) {
              await sendEmail(
                profile.email,
                "Refund processed",
                `<!doctype html><html><body style="font-family:sans-serif">
<p>Your refund of ${((charge.amount_refunded || 0) / 100).toFixed(2)} ${escapeHtml(
                  (charge.currency || "usd").toUpperCase()
                )} has been processed.</p>
<p>Course access has been revoked.</p>
</body></html>`
              );
            }
          } catch (err) {
            console.error(
              "Refund email failed:",
              err instanceof Error ? err.message : "unknown"
            );
          }
        }
      }
      break;
    }
  }

  return jsonResponse({ received: true }, 200, headers);
}
