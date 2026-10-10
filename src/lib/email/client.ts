import { Resend } from "resend";
import {
  certificateIssuedEmail,
  enrollmentConfirmedEmail,
  refundProcessedEmail,
  reviewAssignedEmail,
  sessionReminderEmail,
  welcomeEmail,
} from "./templates";

export type SendResult = {
  id?: string;
  skipped: boolean;
  error?: string;
};

let resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "noreply@startech.com";
}

/**
 * Sends rendered HTML. Fails soft: without RESEND_API_KEY the message is
 * logged and skipped so development flows never break on missing credentials.
 */
export async function sendTemplateEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<SendResult> {
  const client = getResend();
  if (!client) {
    console.info(
      `[email skipped — no RESEND_API_KEY] to=${String(options.to)} subject="${options.subject}"`
    );
    return { skipped: true };
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error("Email send failed:", error.message);
      return { skipped: false, error: error.message };
    }
    return { id: data?.id, skipped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("Email send failed:", message);
    return { skipped: false, error: message };
  }
}

export function sendWelcomeEmail(to: string, fullName: string) {
  const { subject, html } = welcomeEmail(fullName);
  return sendTemplateEmail({ to, subject, html });
}

export function sendEnrollmentConfirmedEmail(
  to: string,
  params: {
    courseTitle: string;
    cohortName: string;
    amount: number;
    currency: string;
  }
) {
  const { subject, html } = enrollmentConfirmedEmail(params);
  return sendTemplateEmail({ to, subject, html });
}

export function sendSessionReminderEmail(
  to: string,
  params: {
    title: string;
    startTime: string;
    platform: string;
    timezone: string;
    joinUrl?: string | null;
    minutesUntil: number;
  }
) {
  const { subject, html } = sessionReminderEmail(params);
  return sendTemplateEmail({ to, subject, html });
}

export function sendReviewAssignedEmail(
  to: string,
  params: {
    assignmentTitle: string;
    dueAt?: string | null;
    reviewCount: number;
  }
) {
  const { subject, html } = reviewAssignedEmail(params);
  return sendTemplateEmail({ to, subject, html });
}

export function sendCertificateIssuedEmail(
  to: string,
  params: {
    studentName: string;
    courseTitle: string;
    certificateNumber: string;
    verifyUrl: string;
    linkedinUrl?: string;
  }
) {
  const { subject, html } = certificateIssuedEmail(params);
  return sendTemplateEmail({ to, subject, html });
}

export function sendRefundProcessedEmail(
  to: string,
  params: {
    courseTitle: string;
    amount: number;
    currency: string;
    reason?: string | null;
  }
) {
  const { subject, html } = refundProcessedEmail(params);
  return sendTemplateEmail({ to, subject, html });
}
