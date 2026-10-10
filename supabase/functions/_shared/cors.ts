export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, stripe-signature, x-paystack-signature",
  "Access-Control-Max-Age": "86400",
};

export type CorsResult = {
  headers: Record<string, string>;
  preflight: Response | null;
};

export function handleCors(req: Request): CorsResult {
  const headers = { ...CORS_HEADERS };
  if (req.method === "OPTIONS") {
    return {
      headers,
      preflight: new Response(null, { status: 204, headers }),
    };
  }
  return { headers, preflight: null };
}

export function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}
