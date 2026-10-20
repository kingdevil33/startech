# Supabase Edge Functions

Deno-based edge functions for StarTech. Each function is a single `index.ts`
inside its own directory; shared helpers live in `_shared/`.

| Function | Purpose | Auth |
| --- | --- | --- |
| `cron-reminders` | 24h/1h live-session reminders (notification + email) | `Authorization: Bearer $CRON_SECRET` |
| `cron-certificates` | Issues certificates for enrollments that meet course rules | `Authorization: Bearer $CRON_SECRET` |
| `stripe-webhook` | Stripe `checkout.session.completed` + `charge.refunded` | Stripe signature |
| `paystack-webhook` | Paystack `charge.success` + `refund.processed` | Paystack signature |
| `ai-chat` | AI Study Buddy (RAG + OpenAI) | Supabase user JWT |

## Deploy

From the repo root (the existing `supabase/config.toml` identifies the project):

```bash
supabase functions deploy cron-reminders --no-verify-jwt
supabase functions deploy cron-certificates --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy paystack-webhook --no-verify-jwt
supabase functions deploy ai-chat --no-verify-jwt
```

`ai-chat` still validates the caller's bearer token itself (401 without a
valid Supabase access token), so `--no-verify-jwt` only skips the platform's
pre-check.

`supabase/config.toml` already exists in this repo — do not run
`supabase init` again.

## Secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.
Set the rest with:

```bash
supabase secrets set CRON_SECRET=... \
  RESEND_API_KEY=... RESEND_FROM_EMAIL=noreply@startech.com \
  APP_URL=https://your-domain.com \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  PAYSTACK_SECRET_KEY=sk_... \
  OPENAI_API_KEY=sk-... \
  UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=...
```

| Secret | Used by | Required |
| --- | --- | --- |
| `CRON_SECRET` | `cron-reminders`, `cron-certificates` (fail closed when unset) | yes |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | reminder/certificate/webhook emails (skipped when unset) | optional |
| `APP_URL` | certificate verify/LinkedIn URLs | recommended |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` (fail closed when unset) | yes for Stripe |
| `PAYSTACK_SECRET_KEY` | `paystack-webhook` (fail closed when unset) | yes for Paystack |
| `OPENAI_API_KEY` | `ai-chat` embeddings + completions | yes for AI |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | `ai-chat` rate limit (fails open when unset) | optional |

Never commit real values; keep them in Supabase secrets and `.env.local`.

## Scheduling

Functions are invoked over HTTP. Schedule them with pg_cron + pg_net inside
the Supabase SQL editor, or with any external cron/CI scheduler.

```sql
-- every 15 minutes
select cron.schedule('cron-reminders', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || '<CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);

-- daily at 03:00 UTC
select cron.schedule('cron-certificates', '0 3 * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-certificates',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || '<CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
$$);
```

Recommended cadence: `cron-reminders` every 15 minutes, `cron-certificates`
once daily. Point the Stripe/Paystack dashboards' webhook endpoints at
`https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook` and
`.../paystack-webhook`.

> **Webhook endpoints:** the Next.js app exposes the same events at
> `/api/webhooks/stripe` and `/api/webhooks/paystack`. Register **one** of the
> two with each gateway — the handlers are idempotent (duplicates are ignored),
> but double delivery wastes work. In local dev, forward Stripe CLI events to
> `http://localhost:3000/api/webhooks/stripe`.

The equivalent Next.js cron routes (`/api/cron/*`) remain available when the
app is deployed — see the "Cron jobs" section of the root README.
