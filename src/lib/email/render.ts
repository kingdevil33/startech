const INTER =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const OUTFIT = "'Outfit', sans-serif";

export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailRendered = { subject: string; html: string };

export type RenderOptions = {
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
};

/**
 * Shared StarTech email shell. Plain HTML string — no React, so it is safe to
 * import from server actions and route handlers.
 */
export function renderEmailHtml({
  title,
  body,
  ctaLabel,
  ctaHref,
}: RenderOptions): string {
  const cta =
    ctaLabel && ctaHref
      ? `        <p style="margin-top:24px">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background-color:#22c55e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">${escapeHtml(ctaLabel)}</a>
        </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0">
    <div style="font-family:${INTER};background-color:#f4f6f8;padding:32px 16px">
      <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
        <div style="background-color:#1e3a5f;padding:24px 32px">
          <p style="font-family:${OUTFIT};font-size:20px;font-weight:700;letter-spacing:0.5px;color:#ffffff;margin:0">Star<span style="color:#4ade80">Tech</span></p>
        </div>
        <div style="height:4px;background-color:#22c55e"></div>
        <div style="padding:32px;color:#111827;font-size:15px;line-height:1.6">
          <h1 style="font-family:${OUTFIT};font-size:22px;font-weight:700;color:#1e3a5f;margin:0 0 16px">${escapeHtml(title)}</h1>
${body}
${cta}
        </div>
        <div style="padding:20px 32px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center">
          <p style="margin:0">StarTech Academy — Learn. Build. Launch.</p>
          <p style="margin:6px 0 0">You are receiving this email because you have an account on StarTech.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
