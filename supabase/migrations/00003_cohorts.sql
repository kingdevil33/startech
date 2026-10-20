-- Migration: 00003_cohorts
-- Cohort = a specific run of a course with dates, capacity, and pricing

create type public.cohort_status as enum (
  'draft',
  'enrollment_open',
  'enrollment_closed',
  'active',
  'completed',
  'archived'
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,

  -- Pricing
  price numeric(10, 2) not null,
  currency text not null default 'GHS',

  -- Capacity
  capacity integer not null default 50,
  seats_filled integer not null default 0,

  -- Dates (all stored in UTC)
  enrollment_opens_at timestamptz not null,
  enrollment_closes_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,

  -- Timezone for display purposes
  timezone text not null default 'Africa/Accra',

  -- Status
  status public.cohort_status not null default 'draft',

  -- Post-cohort access
  post_access_days integer not null default 90,

  -- Coupon codes (JSON array of {code, discount_percent, max_uses, used})
  coupon_codes jsonb default '[]'::jsonb,

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Constraints
  constraint cohorts_slug_course_unique unique (course_id, slug),
  constraint cohorts_dates_valid check (
    enrollment_opens_at < enrollment_closes_at
    and enrollment_closes_at <= starts_at
    and starts_at < ends_at
  ),
  constraint cohorts_capacity_valid check (capacity > 0),
  constraint cohorts_price_valid check (price >= 0)
);

create index idx_cohorts_course on public.cohorts(course_id);
create index idx_cohorts_status on public.cohorts(status);
create index idx_cohorts_dates on public.cohorts(enrollment_opens_at, enrollment_closes_at, starts_at, ends_at);

create trigger cohorts_updated_at
  before update on public.cohorts
  for each row execute function public.update_updated_at();

-- Helper: check if enrollment is open for a cohort
create or replace function public.is_enrollment_open(p_cohort_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_cohort public.cohorts;
begin
  select * into v_cohort from public.cohorts where id = p_cohort_id;
  if not found then return false; end if;

  return v_cohort.status = 'enrollment_open'
    and now() >= v_cohort.enrollment_opens_at
    and now() <= v_cohort.enrollment_closes_at
    and v_cohort.seats_filled < v_cohort.capacity;
end;
$$;
