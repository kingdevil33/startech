import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { refundStripePayment } from "@/lib/stripe/checkout";
import { refundPaystackTransaction } from "@/lib/paystack/checkout";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/admin/refund — admin-initiated refund.
 * Same flow as the admin server action, exposed as an API for tooling.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = await checkRateLimit(apiRateLimit, `api:${user.id}`);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: payment } = await supabase
      .from("payments")
      .select(
        "id, enrollment_id, user_id, cohort_id, amount, currency, gateway, status, gateway_session_id, gateway_payment_id"
      )
      .eq("id", parsed.data.paymentId)
      .single();

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (payment.status === "refunded") {
      return NextResponse.json(
        { error: "Payment already refunded" },
        { status: 409 }
      );
    }

    // Refund at the gateway
    if (payment.gateway === "stripe" && payment.gateway_payment_id) {
      await refundStripePayment(payment.gateway_payment_id, payment.amount);
    } else if (payment.gateway === "paystack" && payment.gateway_session_id) {
      await refundPaystackTransaction(
        payment.gateway_session_id,
        payment.amount
      );
    }

    const refundAmount = payment.gateway === "stripe" || payment.gateway === "paystack"
      ? payment.amount
      : 0;

    await supabase.from("payments").update({
      status: "refunded",
      refund_amount: refundAmount,
      refunded_at: new Date().toISOString(),
    }).eq("id", payment.id);

    await supabase
      .from("enrollments")
      .update({ status: "refunded" })
      .eq("id", payment.enrollment_id);

    await supabase.rpc("create_notification", {
      p_user_id: payment.user_id,
      p_type: "refund_processed",
      p_title: "Refund Processed",
      p_body: `Your refund of ${payment.currency} ${refundAmount.toFixed(2)} has been processed.`,
    });

    await supabase.rpc("log_audit", {
      p_actor_id: user.id,
      p_action: "payment.refunded",
      p_entity_type: "payment",
      p_entity_id: payment.id,
      p_details: {
        amount: refundAmount,
        reason: parsed.data.reason ?? null,
        gateway: payment.gateway,
      },
    });

    return NextResponse.json({ ok: true, refundAmount });
  } catch (err) {
    console.error("Refund failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refund failed" },
      { status: 502 }
    );
  }
}
