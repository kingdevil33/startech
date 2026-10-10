-- Migration: 00004_weeks_lessons
-- Weeks belong to a course (template), lessons belong to a week

create type public.lesson_type as enum ('video', 'text', 'quiz', 'resource');

create table public.weeks (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  week_number integer not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint weeks_number_unique unique (course_id, week_number)
);

create index idx_weeks_course on public.weeks(course_id);

create trigger weeks_updated_at
  before update on public.weeks
  for each row execute function public.update_updated_at();

create table public.lessons (
  id uuid primary key default uuid_generate_v4(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  content text, -- markdown content for text lessons
  lesson_type public.lesson_type not null default 'video',
  sort_order integer not null default 0,
  duration_minutes integer, -- estimated duration
  is_published boolean not null default false,
  is_free_preview boolean not null default false, -- allow guests to preview
  resources jsonb default '[]'::jsonb, -- [{title, url, type}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint lessons_slug_week_unique unique (week_id, slug)
);

create index idx_lessons_week on public.lessons(week_id);
create index idx_lessons_sort on public.lessons(week_id, sort_order);

create trigger lessons_updated_at
  before update on public.lessons
  for each row execute function public.update_updated_at();

-- Helper: check if a week is unlocked for a cohort based on drip schedule
create or replace function public.is_week_unlocked(p_week_id uuid, p_cohort_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_week public.weeks;
  v_cohort public.cohorts;
  v_unlock_date timestamptz;
begin
  select * into v_week from public.weeks where id = p_week_id;
  select * into v_cohort from public.cohorts where id = p_cohort_id;

  if not found then return false; end if;

  -- Week unlocks based on week_number relative to cohort start date
  -- Week 1 unlocks at starts_at, Week 2 unlocks 7 days later, etc.
  v_unlock_date := v_cohort.starts_at + ((v_week.week_number - 1) * interval '7 days');

  return now() >= v_unlock_date;
end;
$$;

-- Helper: get the course_id for a week
create or replace function public.get_course_id_for_week(p_week_id uuid)
returns uuid
language sql
security definer
as $$
  select course_id from public.weeks where id = p_week_id;
$$;
