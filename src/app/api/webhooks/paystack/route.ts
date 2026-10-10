import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  notifyEnrollmentConfirmed,
  notifyRefundProcessed,
} from "@/lib/email/notify";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

function verifyPaystackSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-paystack-signature") || "";

  if (!verifyPaystackSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = getSupabase();

  switch (event.event) {
    case "charge.success": {
      const data = event.data;
      const metadata = data.metadata;

      if (!metadata?.enrollment_id) break;

      // Activate enrollment
      await supabase
        .from("enrollments")
        .update({
          status: "active",
          reserved_until: null,
        })
        .eq("id", metadata.enrollment_id);

      // Update payment record
      await supabase
        .from("payments")
        .update({
          status: "completed",
          gateway_payment_id: String(data.id),
          gateway_receipt_url: data.receipt_url || null,
        })
        .eq("gateway_session_id", data.reference);

      // Notification
      await supabase.rpc("create_notification", {
        p_user_id: metadata.user_id,
        p_type: "enrollment_confirmed",
        p_title: "Enrollment Confirmed!",
        p_body: "Your payment was successful. Welcome to the course!",
        p_link: `/dashboard`,
        p_cohort_id: metadata.cohort_id,
      });

      // Audit
      await supabase.rpc("log_audit", {
        p_actor_id: metadata.user_id,
        p_action: "enrollment.activated",
        p_entity_type: "enrollment",
        p_entity_id: metadata.enrollment_id,
        p_details: {
          gateway: "paystack",
          amount: data.amount / 100,
          reference: data.reference,
        },
      });

      await notifyEnrollmentConfirmed(supabase, metadata.enrollment_id, {
        amount: data.amount / 100,
        currency: String(data.currency || "GHS").toLowerCase(),
      });

      break;
    }

    case "refund.processed": {
      const data = event.data;
      const reference = data.transaction?.reference;

      if (reference) {
        const { data: payment } = await supabase
          .from("payments")
          .select("id, enrollment_id, user_id")
          .eq("gateway_session_id", reference)
          .single();

        if (payment) {
          await supabase
            .from("payments")
            .update({
              status: "refunded",
              refund_amount: data.amount / 100,
              refunded_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

          await supabase
            .from("enrollments")
            .update({ status: "refunded" })
            .eq("id", payment.enrollment_id);

          await supabase.rpc("create_notification", {
            p_user_id: payment.user_id,
            p_type: "refund_processed",
            p_title: "Refund Processed",
            p_body: `Your refund has been processed.`,
          });

          await notifyRefundProcessed(supabase, payment.id, {
            amount: data.amount / 100,
            currency: String(data.currency || "GHS").toLowerCase(),
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
