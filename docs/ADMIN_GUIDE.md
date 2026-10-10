# StarTech Admin Guide

Operator handbook for the StarTech LMS. Every action below is available to
accounts with `profiles.role = 'admin'`; instructor/TA actions live under
`/manage/*`.

## Promoting a user to admin

Preferred (UI): open **Admin → Users** (`/admin/users`), find the user, change
their role dropdown. The change is written to `profiles.role` and logged to
the audit log.

SQL (Supabase SQL editor or `psql`):

```sql
update public.profiles
set role = 'admin'
where email = 'user@example.com';
```

Demote the same way (`role = 'instructor'`, `'teaching_assistant'`,
`'student'`). The enum only accepts:

```sql
select public.user_role;  -- admin | instructor | teaching_assistant | student
```

Sanity check:

```sql
select p.email, p.role, p.is_active
from public.profiles p
where p.role = 'admin';
```

To lock an account without deleting it, use **Admin → Users → Suspend**
(`is_active = false`); suspended users can no longer sign in or be selected
as announcement recipients.

## Managing courses

- **Admin → Courses** (`/admin/courses`): every course in the platform,
  including ones owned by other instructors.
- **Instructor workspace** (`/manage/courses`): create a course, then add
  `weeks → lessons`, assignments and live sessions. Draft courses stay hidden
  from the public catalog until published (toggle on the course page).
- Certificate rules are per course (`courses.certificate_rules`,
  `jsonb`): `lessons_complete_percent`, `live_attendance_percent`,
  `assignments_submitted_percent`, `peer_reviews_completed_percent`. Missing
  keys fall back to the defaults (80 / 70 / 100 / 100).
- Content drip: week *N* unlocks at cohort `starts_at + (N-1)` weeks. Publish
  a week before the cohort starts so students are not stuck on week 1.

## Managing cohorts

**Admin → Cohorts** (`/admin/cohorts`) or **Manage → Cohorts** for your own.
Key fields: `capacity`, `price`, `currency`, `timezone`, `starts_at`,
`ends_at`, `enrollment_closes_at`, `post_access_days`.

### Lifecycle statuses

`cohorts.status` is the `cohort_status` enum:

```
draft → enrollment_open → enrollment_closed → active → completed → archived
```

| Status | Meaning | Transition |
| --- | --- | --- |
| `draft` | Being prepared; not sellable | Manual (publish) |
| `enrollment_open` | Accepting enrollments and payments | Manual, while seats remain |
| `enrollment_closed` | Enrollment window closed; waiting for start | `POST /api/cron/cohort-status` when `enrollment_closes_at` passes |
| `active` | Running: lessons, live sessions, assignments | Cron when `starts_at` is reached |
| `completed` | `ends_at` passed; grading and certificates wrap up | Cron |
| `archived` | `ends_at + post_access_days` passed; read-only | Cron |

The cron endpoint only moves cohorts **forward**, based on dates — fix a
wrong state by correcting the dates and re-running the job:

```bash
curl -X POST http://localhost:3000/api/cron/cohort-status \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Refund process

1. Open **Admin → Refunds** or **Admin → Payments** and locate the payment.
2. Start the refund (UI action, or the API for tooling):

   ```bash
   curl -X POST http://localhost:3000/api/admin/refund \
     -H "Authorization: Bearer $YOUR_SESSION_COOKIE" \
     -H "Content-Type: application/json" \
     -d '{"paymentId":"<uuid>","reason":"requested by customer"}'
   ```

   The route requires a signed-in admin session (not the cron secret).

3. What happens:
   - The gateway refund is issued (Stripe payment intent / Paystack reference).
   - `payments.status = 'refunded'`, `refund_amount`, `refunded_at` are set.
   - `enrollments.status = 'refunded'` (course access ends).
   - The student gets an in-app `refund_processed` notification.
   - An audit entry `payment.refunded` is written with amount, reason, gateway.
4. The gateway webhook (`charge.refunded` / `refund.processed`) is the
   safety net for refunds started outside the app — it performs the same
   state changes.

Already-refunded payments are rejected with `409`.

## Certificate revocation

Open **Admin → Certificates** (`/admin/certificates`):

- **Revoke** prompts for a reason, then sets `is_revoked = true`,
  `revoked_at`, `revoked_by`, `revoke_reason` and audits
  `certificate.revoked`.
- **Restore** clears those fields and audits `certificate.restored`.

Revoked certificates immediately show as invalid on `/verify/[certificateId]`
(reason included), the student's dashboard marks them revoked, and the PDF
download is restricted to the owner and admins.

## Announcements

**Admin → Announcements** (`/admin/announcements`):

- Title (≤ 120 chars) + body; audience `all`, `students`, or
  `instructors` (includes TAs).
- Delivered as in-app notifications via the `create_notification` RPC,
  capped at 500 recipients per send and only to active accounts.
- Audited as `announcement.sent` with audience and count.

## Data export (GDPR)

```bash
curl -X POST http://localhost:3000/api/admin/export-data \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin session>" \
  -d '{"userId":"<uuid>"}' \
  -o startech-export.json
```

- Any signed-in user can export **their own** data by omitting `userId`.
- Admins may pass another account's `userId`; the export reads through the
  service-role client (works even for suspended accounts) and audits
  `gdpr.export`.
- Response is a JSON attachment containing profile, enrollments, payments,
  progress, submissions, reviews, forum threads/posts, notifications,
  certificates, AI conversations/messages and the user's audit entries.

## Audit log

**Admin → Audit Log** (`/admin/audit-log`) renders the `audit_log` table.
Every entry is written through the `log_audit` RPC
(`actor_id`, `action`, `entity_type`, `entity_id`, `details`). Recurring
actions to expect:

| Action | When |
| --- | --- |
| `enrollment.activated` | Payment webhook confirms an enrollment |
| `payment.refunded` | Refund issued from the admin UI/API |
| `certificate.issued` / `certificate.revoked` / `certificate.restored` | Certificate lifecycle |
| `announcement.sent` | Broadcast delivered |
| `gdpr.export` | Admin exported another user's data |
| role changes / user suspensions | Admin → Users edits |

Treat the log as append-only; investigate anomalies (repeated role changes,
refund spikes) from here.

## Platform status page

**`/admin/settings`** is a read-only health dashboard. It shows:

- **Integrations** — Stripe, Paystack, Mux, Zoom, YouTube, Resend, OpenAI,
  Upstash and Supabase as green/red dots (configured vs missing). Values are
  never rendered, only presence.
- **Scheduled jobs** — whether `CRON_SECRET` exists and whether each of the
  five `/api/cron/*` endpoints is protected, with a copy-paste curl example.
- **Data & compliance** — quick links to the audit log, payments and the
  data-export endpoint.

If a dot is red, add the listed environment variable to `.env.local` (or the
hosting platform) and restart the server.

## Routine checklist

| Cadence | Task |
| --- | --- |
| Daily | Check `/admin/payments` for failed/pending payments; run the `certificates` cron |
| Per cohort start | Confirm `enrollment_closed → active` fired; sessions exist |
| Per cohort end | Confirm `completed`, grade leftovers, spot-check issued certificates |
| Weekly | Review `/admin/audit-log`, enrollment capacity, and refund reasons |
| On request | User data export, account suspension, certificate revocation |
