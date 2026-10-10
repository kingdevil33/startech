export const NOTIFICATION_CATEGORIES = [
  "session_reminder",
  "review_assigned",
  "assignment_due",
  "certificate_issued",
  "forum_reply",
  "announcement",
  "refund_processed",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationPreferences = {
  email: boolean;
  in_app: boolean;
  categories: Partial<
    Record<NotificationCategory, { email: boolean; in_app: boolean }>
  >;
};

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  session_reminder: "Live session reminders",
  review_assigned: "Peer review assignments",
  assignment_due: "Assignment deadlines",
  certificate_issued: "Certificates issued",
  forum_reply: "Forum replies & mentions",
  announcement: "Platform announcements",
  refund_processed: "Refund updates",
};
