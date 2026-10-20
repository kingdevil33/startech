-- Migration: 00002_courses
-- Course template table — the blueprint for cohorts

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  long_description text, -- markdown
  thumbnail_url text,
  instructor_id uuid references public.profiles(id) on delete set null,
  category text,
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  estimated_duration_weeks integer not null default 8,
  is_published boolean not null default false,

  -- Certificate completion rules (configurable per course)
  certificate_rules jsonb not null default '{
    "lessons_complete_percent": 80,
    "live_attendance_percent": 70,
    "assignments_submitted_percent": 100,
    "peer_reviews_completed_percent": 100
  }'::jsonb,

  -- SEO / metadata
  meta_title text,
  meta_description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_courses_slug on public.courses(slug);
create index idx_courses_instructor on public.courses(instructor_id);
create index idx_courses_published on public.courses(is_published);

create trigger courses_updated_at
  before update on public.courses
  for each row execute function public.update_updated_at();
