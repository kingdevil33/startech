-- Migration: 00007_enrollments_payments
-- Enrollment and payment tracking with seat reservation support

create type public.enrollment_status as enum (
  'reserved',  -- seat held during checkout (expires after 15 min)
  'active',    -- paid and enrolled
  'completed', -- finished the cohort
  'dropped',   -- student dropped out
  'refunded',  -- admin issued refund
  'expired'    -- post-cohort access expired
);

create type public.payment_status as enum (
  'pending',
  'completed',
  'failed',
  'refunded',
  'partially_refunded'
);

create type public.payment_gateway as enum ('stripe', 'paystack');

create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  status public.enrollment_status not null default 'reserved',

  -- Reservation expiry (for seat holds during checkout)
  reserved_until timestamptz,

  -- Post-cohort access
  access_expires_at timestamptz,

  -- Completion tracking
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint enrollments_unique unique (user_id, cohort_id)
);

create index idx_enrollments_user on public.enrollments(user_id);
create index idx_enrollments_cohort on public.enrollments(cohort_id);
create index idx_enrollments_status on public.enrollments(status);

create trigger enrollments_updated_at
  before update on public.enrollments
  for each row execute function public.update_updated_at();

create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,

  -- Payment details
  amount numeric(10, 2) not null,
  currency text not null default 'GHS',
  gateway public.payment_gateway not null,
  status public.payment_status not null default 'pending',

  -- Gateway references
  gateway_session_id text, -- Stripe checkout session ID or Paystack reference
  gateway_payment_id text, -- Stripe payment intent ID or Paystack transaction ID
  gateway_receipt_url text,

  -- Coupon applied
  coupon_code text,
  discount_amount numeric(10, 2) default 0,

  -- Refund info
  refund_amount numeric(10, 2),
  refund_reason text,
  refunded_at timestamptz,
  refunded_by uuid references public.profiles(id) on delete set null,

  -- Idempotency
  idempotency_key text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_enrollment on public.payments(enrollment_id);
create index idx_payments_user on public.payments(user_id);
create index idx_payments_cohort on public.payments(cohort_id);
create index idx_payments_gateway_session on public.payments(gateway_session_id);
create index idx_payments_status on public.payments(status);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.update_updated_at();

-- Helper: check if a user is enrolled (active) in a cohort
create or replace function public.is_enrolled(p_user_id uuid, p_cohort_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.enrollments
    where user_id = p_user_id
      and cohort_id = p_cohort_id
      and status in ('active', 'completed')
      and (access_expires_at is null or access_expires_at > now())
  );
end;
$$;

-- Helper: reserve a seat (increment seats_filled, create enrollment)
create or replace function public.reserve_seat(
  p_user_id uuid,
  p_cohort_id uuid,
  p_reservation_minutes integer default 15
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_enrollment_id uuid;
  v_cohort public.cohorts;
begin
  -- Lock the cohort row to prevent race conditions
  select * into v_cohort
    from public.cohorts
    where id = p_cohort_id
    for update;

  if not found then
    raise exception 'Cohort not found';
  end if;

  if v_cohort.seats_filled >= v_cohort.capacity then
    raise exception 'No seats available';
  end if;

  if v_cohort.status != 'enrollment_open' then
    raise exception 'Enrollment is not open';
  end if;

  if now() < v_cohort.enrollment_opens_at or now() > v_cohort.enrollment_closes_at then
    raise exception 'Not within enrollment window';
  end if;

  -- Check for existing enrollment
  select id into v_enrollment_id
    from public.enrollments
    where user_id = p_user_id and cohort_id = p_cohort_id;

  if v_enrollment_id is not null then
    raise exception 'Already enrolled or reserved';
  end if;

  -- Create reservation
  insert into public.enrollments (user_id, cohort_id, status, reserved_until)
  values (p_user_id, p_cohort_id, 'reserved', now() + (p_reservation_minutes || ' minutes')::interval)
  returning id into v_enrollment_id;

  -- Increment seats
  update public.cohorts
    set seats_filled = seats_filled + 1
    where id = p_cohort_id;

  return v_enrollment_id;
end;
$$;

-- Helper: release expired seat reservations (called by cron)
create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  with expired as (
    delete from public.enrollments
    where status = 'reserved'
      and reserved_until < now()
    returning cohort_id
  )
  update public.cohorts c
    set seats_filled = seats_filled - sub.cnt
    from (select cohort_id, count(*) as cnt from expired group by cohort_id) sub
    where c.id = sub.cohort_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
