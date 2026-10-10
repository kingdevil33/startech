import { escapeHtml, renderEmailHtml, type EmailRendered } from "./render";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

export function welcomeEmail(fullName: string): EmailRendered {
  const first = fullName.split(" ")[0] || "there";
  return {
    subject: "Welcome to StarTech",
    html: renderEmailHtml({
      title: `Welcome, ${first}!`,
      ctaLabel: "Open your dashboard",
      ctaHref: `${appUrl()}/dashboard`,
      body: `          <p>Your StarTech account is ready. Browse the course catalog, enroll in an open cohort, and start building.</p>
          <p>Here is what you can do next:</p>
          <ul style="padding-left:20px;margin:8px 0">
            <li>Explore published courses and upcoming cohorts</li>
            <li>Join the cohort discussion forum</li>
            <li>Ask the AI Study Buddy about course material</li>
          </ul>`,
    }),
  };
}

export function enrollmentConfirmedEmail(params: {
  courseTitle: string;
  cohortName: string;
  amount: number;
  currency: string;
}): EmailRendered {
  return {
    subject: `Enrollment confirmed — ${params.courseTitle}`,
    html: renderEmailHtml({
      title: "Enrollment confirmed",
      ctaLabel: "Go to your course",
      ctaHref: `${appUrl()}/dashboard`,
      body: `          <p>Your payment was received and your seat is confirmed. You now have full access to <strong>${escapeHtml(params.courseTitle)}</strong> — ${escapeHtml(params.cohortName)}.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
            <tbody>
              <tr>
                <td style="padding:8px 0;color:#6b7280">Amount paid</td>
                <td style="padding:8px 0;text-align:right;font-weight:600">${escapeHtml(params.currency)} ${params.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <p style="color:#6b7280;font-size:13px">Keep this email as your receipt. You can view invoices any time from your billing settings.</p>`,
    }),
  };
}

export function sessionReminderEmail(params: {
  title: string;
  startTime: string;
  platform: string;
  timezone: string;
  joinUrl?: string | null;
  minutesUntil: number;
}): EmailRendered {
  const when =
    params.minutesUntil >= 60
      ? `in about ${Math.round(params.minutesUntil / 60)} hour(s)`
      : `in about ${params.minutesUntil} minute(s)`;

  return {
    subject: `Starting soon: ${params.title}`,
    html: renderEmailHtml({
      title: `Live session starting ${when}`,
      ctaLabel: params.joinUrl ? "Join session" : null,
      ctaHref: params.joinUrl ?? null,
      body: `          <p><strong>${escapeHtml(params.title)}</strong> starts ${escapeHtml(when)}.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tbody>
              <tr>
                <td style="padding:6px 0;color:#6b7280">Starts</td>
                <td style="padding:6px 0;text-align:right">${escapeHtml(params.startTime)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280">Timezone</td>
                <td style="padding:6px 0;text-align:right">${escapeHtml(params.timezone)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280">Platform</td>
                <td style="padding:6px 0;text-align:right;text-transform:capitalize">${escapeHtml(params.platform)}</td>
              </tr>
            </tbody>
          </table>${
            params.joinUrl
              ? ""
              : `\n          <p style="color:#6b7280;font-size:13px">The join link becomes available shortly before the session starts.</p>`
          }`,
    }),
  };
}

export function reviewAssignedEmail(params: {
  assignmentTitle: string;
  dueAt?: string | null;
  reviewCount: number;
}): EmailRendered {
  const due = params.dueAt
    ? ` — please finish them by <strong>${escapeHtml(params.dueAt)}</strong>`
    : "";

  return {
    subject: `Peer review assigned — ${params.assignmentTitle}`,
    html: renderEmailHtml({
      title: "You have peer reviews to complete",
      ctaLabel: "Start reviewing",
      ctaHref: `${appUrl()}/dashboard/reviews`,
      body: `          <p>A classmate submitted work for <strong>${escapeHtml(params.assignmentTitle)}</strong> and it has been assigned to you for review.</p>
          <p>You have <strong>${params.reviewCount}</strong> pending review${params.reviewCount === 1 ? "" : "s"}${due}.</p>
          <p style="color:#6b7280;font-size:13px">Peer reviews are anonymous when the assignment is configured for anonymous review.</p>`,
    }),
  };
}

export function certificateIssuedEmail(params: {
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  verifyUrl: string;
  linkedinUrl?: string;
}): EmailRendered {
  const linkedin = params.linkedinUrl
    ? `\n          <p><a href="${escapeHtml(params.linkedinUrl)}" style="color:#1e3a5f;font-weight:600">Add it to your LinkedIn profile</a></p>`
    : "";

  return {
    subject: `Your certificate for ${params.courseTitle}`,
    html: renderEmailHtml({
      title: "Your certificate is ready",
      ctaLabel: "View certificate",
      ctaHref: `${appUrl()}/dashboard`,
      body: `          <p>Congratulations, ${escapeHtml(params.studentName)}! You have completed <strong>${escapeHtml(params.courseTitle)}</strong> and your certificate has been issued.</p>
          <p>Certificate number: <strong>${escapeHtml(params.certificateNumber)}</strong></p>
          <p style="font-size:13px;color:#6b7280">Anyone can verify this certificate at <a href="${escapeHtml(params.verifyUrl)}" style="color:#1e3a5f">${escapeHtml(params.verifyUrl)}</a>.${linkedin}</p>`,
    }),
  };
}

export function refundProcessedEmail(params: {
  courseTitle: string;
  amount: number;
  currency: string;
  reason?: string | null;
}): EmailRendered {
  const reasonRow = params.reason
    ? `\n              <tr>\n                <td style="padding:6px 0;color:#6b7280">Reason</td>\n                <td style="padding:6px 0;text-align:right">${escapeHtml(params.reason)}</td>\n              </tr>`
    : "";

  return {
    subject: `Refund processed — ${params.courseTitle}`,
    html: renderEmailHtml({
      title: "Refund processed",
      body: `          <p>Your refund for <strong>${escapeHtml(params.courseTitle)}</strong> has been processed.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tbody>
              <tr>
                <td style="padding:6px 0;color:#6b7280">Amount</td>
                <td style="padding:6px 0;text-align:right;font-weight:600">${escapeHtml(params.currency)} ${params.amount.toFixed(2)}</td>
              </tr>${reasonRow}
            </tbody>
          </table>
          <p style="color:#6b7280;font-size:13px">Depending on your bank, refunds can take 5–10 business days to appear on your statement. Your course access has been revoked.</p>`,
    }),
  };
}
