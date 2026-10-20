-- Migration: 00010_peer_reviews
-- Peer review assignment and review tracking

create type public.review_status as enum ('pending', 'completed', 'late', 'skipped');

-- Review assignments: which student reviews which submission
create table public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,

  status public.review_status not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A reviewer can only be assigned once per submission
  constraint review_assignments_unique unique (submission_id, reviewer_id)
);

create index idx_review_assignments_submission on public.review_assignments(submission_id);
create index idx_review_assignments_reviewer on public.review_assignments(reviewer_id);
create index idx_review_assignments_cohort on public.review_assignments(cohort_id);
create index idx_review_assignments_status on public.review_assignments(status);

create trigger review_assignments_updated_at
  before update on public.review_assignments
  for each row execute function public.update_updated_at();

-- Reviews: the actual feedback
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  review_assignment_id uuid not null references public.review_assignments(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  submission_id uuid not null references public.submissions(id) on delete cascade,

  -- Rubric scores: [{criterion_name, score, max_score, comment}]
  rubric_scores jsonb not null default '[]'::jsonb,
  overall_score numeric(5, 2),
  feedback text, -- written feedback

  -- Quality tracking
  is_flagged boolean not null default false, -- student flagged as unhelpful
  flag_reason text,
  quality_score numeric(3, 2), -- instructor can rate review quality (0-5)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviews_assignment_unique unique (review_assignment_id)
);

create index idx_reviews_reviewer on public.reviews(reviewer_id);
create index idx_reviews_submission on public.reviews(submission_id);
create index idx_reviews_flagged on public.reviews(is_flagged) where is_flagged = true;

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.update_updated_at();
