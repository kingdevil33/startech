import { paystackRequest } from "./client";

export type PaystackInitializeParams = {
  email: string;
  amount: number; // major units (GHS) — converted to kobo internally
  currency: string;
  metadata: Record<string, unknown>;
  callbackUrl: string;
};

export type PaystackInitializeResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

/**
 * Initialize a Paystack transaction and return the hosted checkout URL.
 * Amount is expected in major units (e.g. 450 GHS) and converted to kobo.
 */
export async function initializePaystackTransaction(
  params: PaystackInitializeParams
): Promise<PaystackInitializeResult> {
  const { data } = await paystackRequest<PaystackInitializeResult>(
    "/transaction/initialize",
    {
      method: "POST",
      body: {
        email: params.email,
        amount: Math.round(params.amount * 100),
        currency: params.currency.toUpperCase(),
        metadata: params.metadata,
        callback_url: params.callbackUrl,
      },
    }
  );
  return data;
}

/** Verify a transaction by reference (used as a webhook cross-check). */
export async function verifyPaystackTransaction(reference: string) {
  const { data } = await paystackRequest<{
    status: string;
    amount: number;
    currency: string;
    reference: string;
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  return data;
}

/** Initiate a refund for a completed Paystack transaction. */
export async function refundPaystackTransaction(
  reference: string,
  amount?: number
) {
  const { data } = await paystackRequest<{ status: string }>(
    "/refund",
    {
      method: "POST",
      body: {
        reference,
        ...(amount !== undefined
          ? { amount: Math.round(amount * 100) }
          : {}),
      },
    }
  );
  return data;
}
