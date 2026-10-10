import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with clsx */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency amount */
export function formatCurrency(
  amount: number,
  currency = "GHS",
  locale = "en-GH"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Format a date in the user's timezone */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
  timezone?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
}

/** Format a datetime in the user's timezone */
export function formatDateTime(
  date: string | Date,
  timezone?: string
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format relative time (e.g., "2 hours ago", "in 3 days") */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffDay) >= 1) return rtf.format(diffDay, "day");
  if (Math.abs(diffHr) >= 1) return rtf.format(diffHr, "hour");
  if (Math.abs(diffMin) >= 1) return rtf.format(diffMin, "minute");
  return rtf.format(diffSec, "second");
}

/** Slugify a string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Generate a short unique ID */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID().split("-")[0];
  return prefix ? `${prefix}_${id}` : id;
}

/** Truncate text to a max length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/** Calculate percentage */
export function percent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/** Sleep utility for async operations */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if a date is within a range */
export function isWithinRange(
  date: Date,
  start: Date | string,
  end: Date | string
): boolean {
  const d = date.getTime();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return d >= s && d <= e;
}

/** Get the user's timezone */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Safe JSON parse */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sanitize a search term before passing it into a PostgREST `.or()` filter.
 * Commas and parentheses are structural characters in those filters.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[(),]/g, " ").replace(/\s+/g, " ").trim();
}
