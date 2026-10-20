import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { verifyStripeWebhook } from "@/lib/stripe/webhook";
import {
  notifyEnrollmentConfirmed,
  notifyRefundProcessed,
} from "@/lib/email/notify";

// Use service role client for webhook (no user session)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = verifyStripeWebhook(body, sig);
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabase();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (!metadata?.enrollment_id) break;

      // Idempotency: Stripe retries and duplicate endpoint deliveries must
      // not re-send notifications/emails for an already-activated enrollment.
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id, status")
        .eq("id", metadata.enrollment_id)
        .maybeSingle();

      const alreadyActive = enrollment?.status === "active";

      // Activate enrollment
      await supabase
        .from("enrollments")
        .update({
          status: "active",
          reserved_until: null,
        })
        .eq("id", metadata.enrollment_id);

      // Record payment
      await supabase.from("payments").upsert(
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

      // Create notification
      await supabase.rpc("create_notification", {
        p_user_id: metadata.user_id,
        p_type: "enrollment_confirmed",
        p_title: "Enrollment Confirmed!",
        p_body: "Your payment was successful. Welcome to the course!",
        p_link: `/dashboard`,
        p_cohort_id: metadata.cohort_id,
      });

      // Audit log
      await supabase.rpc("log_audit", {
        p_actor_id: metadata.user_id,
        p_action: "enrollment.activated",
        p_entity_type: "enrollment",
        p_entity_id: metadata.enrollment_id,
        p_details: {
          gateway: "stripe",
          amount: (session.amount_total || 0) / 100,
        },
      });

      // Confirmation email (fails soft)
      await notifyEnrollmentConfirmed(supabase, metadata.enrollment_id, {
        amount: (session.amount_total || 0) / 100,
        currency: session.currency || "usd",
      });

      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      if (paymentIntentId) {
        const refundAmount = (charge.amount_refunded || 0) / 100;

        const { data: payment } = await supabase
          .from("payments")
          .select("id, enrollment_id, user_id, status")
          .eq("gateway_payment_id", paymentIntentId)
          .maybeSingle();

        const alreadyRefunded = payment?.status === "refunded";

        await supabase
          .from("payments")
          .update({
            status: "refunded",
            refund_amount: refundAmount,
            refunded_at: new Date().toISOString(),
          })
          .eq("gateway_payment_id", paymentIntentId);

        if (payment && !alreadyRefunded) {
          await supabase
            .from("enrollments")
            .update({ status: "refunded" })
            .eq("id", payment.enrollment_id);

          await supabase.rpc("create_notification", {
            p_user_id: payment.user_id,
            p_type: "refund_processed",
            p_title: "Refund Processed",
            p_body: `Your refund of $${refundAmount.toFixed(2)} has been processed.`,
          });

          await notifyRefundProcessed(supabase, payment.id, {
            amount: refundAmount,
            currency: charge.currency || "usd",
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
