-- Migration: 00009_assignments_submissions
-- Assignments with rubrics and student submissions

create type public.submission_status as enum ('draft', 'submitted', 'late', 'graded');

create table public.assignments (
  id uuid primary key default uuid_generate_v4(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  title text not null,
  description text, -- markdown instructions
  
  -- Rubric: array of criteria
  -- [{name, description, max_score, weight}]
  rubric jsonb not null default '[]'::jsonb,

  -- Submission settings
  submission_types text[] not null default array['text', 'file', 'link'],
  max_file_size_mb integer default 50,
  allowed_file_types text[] default array['application/pdf', 'image/png', 'image/jpeg', 'application/zip'],

  -- Dates (relative to cohort, but stored as offsets)
  due_date_offset_days integer not null default 7, -- days after week unlocks
  review_due_offset_days integer not null default 10, -- days after week unlocks

  -- Peer review settings
  reviews_per_student integer not null default 2,
  is_anonymous_review boolean not null default true,

  is_published boolean not null default false,
  is_required boolean not null default true, -- counts toward certificate

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assignments_week on public.assignments(week_id);

create trigger assignments_updated_at
  before update on public.assignments
  for each row execute function public.update_updated_at();

create table public.submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,

  -- Submission content
  content text, -- text submission
  file_url text, -- file upload URL (Supabase Storage)
  file_name text,
  link_url text, -- external link

  status public.submission_status not null default 'draft',
  submitted_at timestamptz,

  -- Grading (from peer reviews or instructor override)
  final_score numeric(5, 2),
  instructor_override boolean default false,
  instructor_feedback text,
  instructor_score numeric(5, 2),

  -- Flags
  is_late boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint submissions_unique unique (assignment_id, user_id, cohort_id)
);

create index idx_submissions_assignment on public.submissions(assignment_id);
create index idx_submissions_user on public.submissions(user_id);
create index idx_submissions_cohort on public.submissions(cohort_id);
create index idx_submissions_status on public.submissions(status);

create trigger submissions_updated_at
  before update on public.submissions
  for each row execute function public.update_updated_at();

-- Helper: calculate due date for an assignment in a specific cohort
create or replace function public.get_assignment_due_date(
  p_assignment_id uuid,
  p_cohort_id uuid
)
returns timestamptz
language plpgsql
security definer
as $$
declare
  v_assignment public.assignments;
  v_week public.weeks;
  v_cohort public.cohorts;
  v_week_unlock_date timestamptz;
begin
  select * into v_assignment from public.assignments where id = p_assignment_id;
  select * into v_week from public.weeks where id = v_assignment.week_id;
  select * into v_cohort from public.cohorts where id = p_cohort_id;

  v_week_unlock_date := v_cohort.starts_at + ((v_week.week_number - 1) * interval '7 days');
  return v_week_unlock_date + (v_assignment.due_date_offset_days * interval '1 day');
end;
$$;
