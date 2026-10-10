# StarTech LMS

StarTech is a cohort-based learning management system: instructors publish
courses, open time-boxed cohorts, drip weekly content, run live sessions and
peer-reviewed assignments, and issue verifiable certificates — with an AI
Study Buddy grounded in the course material.

## Tech stack

- **Next.js 15** (App Router, Server Components, Server Actions, route handlers)
- **TypeScript** + strict `tsc`
- **Supabase** — Postgres, Auth, RLS, Storage, Realtime, Edge Functions (Deno),
  `pg_cron`/`pg_net` compatible
- **Stripe** + **Paystack** payments
- **Mux** (video hosting/playback) and **YouTube Live** / **Zoom** (live sessions)
- **OpenAI** (`gpt-4o-mini`, `text-embedding-3-small`) + **pgvector** for RAG
- **Resend** transactional email (React-rendered HTML templates)
- **Upstash Redis** rate limiting (fails open when unconfigured)
- **Tailwind CSS 4**, Radix UI, shadcn-style components, Zustand, Zod, React Hook Form

## Local setup

```bash
cp .env.example .env.local      # then fill in every value
npm install
npm run dev                     # http://localhost:3000
```

Database (requires the [Supabase CLI](https://supabase.com/docs/cli) linked to
your project):

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push                # applies supabase/migrations/*.sql in order
```

Optional edge functions: see [`supabase/functions/README.md`](supabase/functions/README.md).

## Environment variables

`.env.local` is gitignored — copy from `.env.example`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (RLS-scoped client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — server/webhooks/cron only, bypasses RLS, never expose to the browser |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` for verifying `stripe-signature` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client checkout) |
| `PAYSTACK_SECRET_KEY` | Paystack API secret key (also the HMAC-SHA512 webhook secret) |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack dashboard webhook secret (reference) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key (client checkout) |
| `MUX_TOKEN_ID` | Mux API token id |
| `MUX_TOKEN_SECRET` | Mux API token secret |
| `MUX_SIGNING_KEY_ID` | Mux signing key id (JWT playback auth) |
| `MUX_SIGNING_PRIVATE_KEY` | Mux signing private key (base64) |
| `MUX_WEBHOOK_SECRET` | HMAC secret for the Mux `video.asset.ready` webhook |
| `ZOOM_ACCOUNT_ID` | Zoom account id (create meetings) |
| `ZOOM_CLIENT_ID` | Zoom OAuth client id |
| `ZOOM_CLIENT_SECRET` | Zoom OAuth client secret |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | Zoom webhook secret token |
| `YOUTUBE_CLIENT_ID` | YouTube OAuth client id |
| `YOUTUBE_CLIENT_SECRET` | YouTube OAuth client secret |
| `YOUTUBE_REFRESH_TOKEN` | YouTube OAuth refresh token (live broadcasts) |
| `OPENAI_API_KEY` | Chat + embeddings for the AI Study Buddy |
| `RESEND_API_KEY` | Resend API key (transactional email) |
| `RESEND_FROM_EMAIL` | From address (default `noreply@startech.com`) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST url (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `NEXT_PUBLIC_APP_URL` | Absolute app URL (certificate links, redirects) |
| `CRON_SECRET` | Bearer token protecting every `/api/cron/*` route (fail-closed: routes reject everything while unset) |
| `NEXT_PUBLIC_ENABLE_PAYSTACK` | Feature flag: show Paystack checkout |
| `NEXT_PUBLIC_ENABLE_STRIPE` | Feature flag: show Stripe checkout |

Also required by `supabase/config.toml` when running local Supabase:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google sign-in).

## npm scripts

| Script | Command |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + `next/typescript`) |
| `npm run type-check` | `tsc --noEmit` |
| `npm run generate-types` | Regenerate `src/lib/supabase/database.types.ts` from the local DB |

No test runner is installed; run the unit tests with:

```bash
npx tsx --test src/lib/__tests__/*.test.ts
```

## Architecture map

### Pages (App Router)

| Route group | Routes |
| --- | --- |
| Marketing/public | `/`, `/about`, `/pricing`, `/courses`, `/courses/[slug]`, `/privacy`, `/verify/[certificateId]` |
| Enrollment | `/enroll/[courseSlug]`, `/enroll/[courseSlug]/[cohortSlug]` |
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback` |
| Student dashboard | `/dashboard`, `/dashboard/courses`, `/dashboard/courses/[courseSlug]` (+ `lessons`, `assignments`), `/dashboard/forum`, `/dashboard/reviews`, `/dashboard/live`, `/dashboard/certificates`, `/dashboard/ai-buddy`, `/notifications`, `/settings/{profile,billing,notifications,privacy}` |
| Instructor/TA | `/manage/courses`, `/manage/courses/[courseId]` (+ `weeks`, `lessons`), `/manage/cohorts`, `/manage/cohorts/[cohortId]`, `/manage/upload`, `/manage/analytics` |
| Admin | `/admin/users`, `/admin/users/[userId]`, `/admin/courses`, `/admin/cohorts`, `/admin/enrollments`, `/admin/payments`, `/admin/refunds`, `/admin/certificates`, `/admin/announcements`, `/admin/audit-log`, `/admin/settings` |

`src/middleware.ts` refreshes the Supabase session on every matched request;
role checks live in the pages/server actions (RLS is the hard boundary).

### API routes (`src/app/api`)

| Route | Purpose |
| --- | --- |
| `POST /api/cron/reminders` | 24h/1h reminders for upcoming live sessions |
| `POST /api/cron/cohort-status` | Advances cohort lifecycle states |
| `POST /api/cron/assign-reviews` | Marks overdue reviews late, assigns peer reviewers, notifies them |
| `POST /api/cron/certificates` | Checks eligibility and issues certificates |
| `POST /api/cron/reindex` | Rebuilds RAG chunks/embeddings for recent lessons |
| `POST /api/checkout` | Starts enrollment checkout (seat reservation → gateway) |
| `POST /api/webhooks/stripe` | Stripe events: `checkout.session.completed`, `charge.refunded` |
| `POST /api/webhooks/paystack` | Paystack events: `charge.success`, `refund.processed` |
| `POST /api/webhooks/mux` | Mux `video.asset.ready` → transcript ingestion into pgvector |
| `POST /api/webhooks/zoom` | Zoom live-session events |
| `POST /api/ai/chat` | AI Study Buddy conversation endpoint |
| `POST /api/ai/embed` | Text embedding helper for the ingestion pipeline |
| `POST /api/certificates/generate` | Renders/downloads the certificate PDF |
| `POST /api/admin/export-data` | GDPR JSON export (self, or any user for admins) |
| `POST /api/admin/refund` | Admin-initiated gateway refund |
| `GET /api/forum/realtime` | Realtime token/channel helper |
| `GET /api/mux/upload`, `GET /api/mux/playback` | Mux upload/playback auth |
| `POST /api/youtube/create-broadcast`, `POST /api/zoom/create-meeting` | Live-session provisioning |

### Supabase edge functions (`supabase/functions/`)

Deno ports of the hot paths, deployable independently of the Next app —
see [`supabase/functions/README.md`](supabase/functions/README.md):
`cron-reminders`, `cron-certificates`, `stripe-webhook`, `paystack-webhook`,
`ai-chat` (shared helpers in `_shared/`). They are excluded from the repo's
`tsconfig.json`.

### Database (supabase/migrations)

| Migration | Tables / objects |
| --- | --- |
| `00001_profiles` | `profiles`, `user_role` enum, signup trigger |
| `00002_courses` | `courses` |
| `00003_cohorts` | `cohorts`, `cohort_status` enum, seat helpers |
| `00004_weeks_lessons` | `weeks`, `lessons` (content drip) |
| `00005_mux_assets` | `mux_assets` |
| `00006_live_sessions` | `live_sessions`, `live_attendance` |
| `00007_enrollments_payments` | `enrollments`, `payments`, `reserve_seat` |
| `00008_progress` | `progress`, `get_enrollment_progress` |
| `00009_assignments_submissions` | `assignments`, `submissions` |
| `00010_peer_reviews` | `review_assignments`, `reviews` |
| `00011_forum` | `forum_categories`, `threads`, `posts`, `reactions` |
| `00012_certificates` | `certificates`, `generate_certificate_number` |
| `00013_ai_pgvector` | `content_chunks` (vector), `ai_conversations`, `ai_messages`, `ai_usage`, `search_content_chunks` |
| `00014_notifications` | `notifications`, `create_notification` |
| `00015_audit_log` | `audit_log`, `log_audit` |
| `00016_rls_policies` | Row-level security for every table |
| `00017_peer_review_assignment_and_grading` | `assign_peer_reviews`, `grade_submission_from_reviews` |

## Roles

`profiles.role` is a `user_role` enum; RLS and server actions both enforce it.

| Role | Access |
| --- | --- |
| `student` | Enroll, watch lessons, submit assignments, peer review, forum, AI buddy, own certificates |
| `teaching_assistant` | Student access plus grading/review moderation for assigned cohorts |
| `instructor` | Create/manage own courses, weeks, lessons, assignments; manage cohorts; grade; issue certificates |
| `admin` | Everything: users/roles, all courses/cohorts, payments/refunds, announcements, audit log, platform settings |

Promote a user with SQL — see [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md).

## Payment flow

1. **Reserve a seat** — `POST /api/checkout` calls the `reserve_seat` RPC:
   the cohort must be `enrollment_open` with a free seat; the enrollment is
   created as `pending` with `reserved_until = now() + 15 minutes`
   (`SEAT_RESERVATION_MINUTES`). An expired reservation frees the seat.
2. **Price** — cohort price + optional coupon (`discount_amount`).
3. **Free cohorts** (`finalPrice <= 0`) — enrollment flips straight to
   `active`, a `gateway: "free"` payment row is written, and the student is
   redirected to the course.
4. **Stripe** — a Checkout Session is created with
   `metadata {enrollment_id, user_id, cohort_id, coupon_code, discount_amount}`;
   a `pending` payment row stores `gateway_session_id`.
5. **Paystack** — `initializePaystackTransaction` returns a payment URL; the
   reference is stored in `gateway_session_id`.
6. **Webhook completes the sale** — `checkout.session.completed` /
   `charge.success` sets `enrollments.status = 'active'`, clears
   `reserved_until`, marks the payment `completed`, creates an
   `enrollment_confirmed` notification, writes an audit-log entry and emails
   the student.
7. **Refunds** — admin action or `POST /api/admin/refund` refunds at the
   gateway, sets payment `refunded` + `enrollments.status = 'refunded'`,
   notifies the student and audits it; gateway `charge.refunded` /
   `refund.processed` webhooks do the same asynchronously.

## Certificate issuance

1. Each course carries configurable `certificate_rules`
   (defaults: lessons ≥ 80%, live attendance ≥ 70%, required assignments 100%,
   peer reviews 100%).
2. `POST /api/cron/certificates` (or `cron-certificates` edge function) walks
   active enrollments in batches of 100.
3. `get_enrollment_progress` supplies lesson/attendance percentages; submitted
   assignments and completed peer reviews supply the rest.
4. `checkEligibility` compares stats against the merged rules; every failing
   rule is reported in `missing`.
5. Eligible enrollments get a `certificate_number` from the
   `generate_certificate_number` RPC and a `certificates` row (unique per
   enrollment), plus a notification, audit entry and email.
6. Public verification lives at `/verify/[certificateId]`; admins can revoke
   (and restore) certificates, which flips `is_revoked` and is reflected on
   the verify page and PDF download.

## AI study buddy (RAG + pgvector)

1. Lesson text and Mux transcripts are chunked (500 words, 50 overlap),
   embedded with `text-embedding-3-small` (1536 dims) and stored in
   `content_chunks`; the `reindex` cron rebuilds recently changed lessons.
2. Chat requests (`POST /api/ai/chat`) authenticate the user, apply a per-user
   sliding-window rate limit (20/min via Upstash) and a monthly budget
   (`ai_usage`, 200 questions/course/month).
3. The query is embedded and matched through the `search_content_chunks` RPC,
   restricted to the student's course and to weeks already unlocked by the
   drip schedule.
4. Retrieved chunks are injected into the Study Buddy system prompt (with
   lesson/week citations); `gpt-4o-mini` answers with a 0.3 temperature.
5. The exchange is persisted (`ai_messages`), sources and token usage are
   stored, and usage counters are upserted.

## Cron jobs

All five endpoints require `Authorization: Bearer $CRON_SECRET`
(also accepts `x-cron-secret: $CRON_SECRET`) and answer **401** when the
secret is missing or wrong. Run them from Vercel Cron, GitHub Actions, pg_cron
or manually:

```bash
curl -X POST http://localhost:3000/api/cron/reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

```bash
curl -X POST http://localhost:3000/api/cron/cohort-status \
  -H "Authorization: Bearer $CRON_SECRET"
```

```bash
curl -X POST http://localhost:3000/api/cron/assign-reviews \
  -H "Authorization: Bearer $CRON_SECRET"
```

```bash
curl -X POST http://localhost:3000/api/cron/certificates \
  -H "Authorization: Bearer $CRON_SECRET"
```

```bash
curl -X POST http://localhost:3000/api/cron/reindex \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"<optional-course-uuid>"}'
```

Suggested schedule: `cohort-status` hourly, `reminders` every 15 minutes,
`assign-reviews` every 30 minutes, `certificates` daily, `reindex` hourly.
Equivalent Deno jobs live in `supabase/functions/` — see
[`supabase/functions/README.md`](supabase/functions/README.md).

## Operations

- Admin/operator handbook: [`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md)
- Platform status (configured integrations, cron readiness): `/admin/settings`
- CI: `.github/workflows/ci.yml` runs `lint`, `type-check`, `build` (and the
  tests when `tsx` is available) on pushes and PRs to `main`.
