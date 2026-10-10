import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { startEnrollmentCheckout } from "@/lib/checkout";

const checkoutSchema = z.object({
  cohortId: z.string().uuid(),
  gateway: z.enum(["stripe", "paystack"]).default("paystack"),
  couponCode: z.string().max(30).optional(),
});

/**
 * POST /api/checkout — create a checkout session for a cohort.
 * Used by the public checkout page; returns a redirect URL.
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

    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await startEnrollmentCheckout({
      userId: user.id,
      userEmail: user.email,
      cohortId: parsed.data.cohortId,
      gateway: parsed.data.gateway,
      couponCode: parsed.data.couponCode,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      url: result.url,
      enrollmentId: result.enrollmentId,
      free: result.free,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 }
    );
  }
}
