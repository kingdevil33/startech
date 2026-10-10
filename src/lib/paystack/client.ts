const PAYSTACK_BASE_URL = "https://api.paystack.co";

function getSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Missing PAYSTACK_SECRET_KEY");
  return key;
}

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

/** Low-level Paystack REST helper. */
export async function paystackRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT"; body?: unknown } = {}
): Promise<PaystackResponse<T>> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const json = (await res.json()) as PaystackResponse<T>;
  if (!json.status) {
    throw new Error(json.message || `Paystack request failed: ${path}`);
  }
  return json;
}
