-- Migration: 00008_progress
-- Tracks lesson completion and watch progress per enrollment

create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,

  -- Progress state
  is_completed boolean not null default false,
  completed_at timestamptz,

  -- Video-specific progress
  watch_seconds numeric(10, 2) default 0,        -- how far they've watched
  total_duration_seconds numeric(10, 2) default 0, -- total video length
  last_position_seconds numeric(10, 2) default 0,  -- resume position

  -- Time tracking
  time_spent_seconds integer default 0,
  last_accessed_at timestamptz default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint progress_unique unique (user_id, lesson_id, enrollment_id)
);

create index idx_progress_user on public.progress(user_id);
create index idx_progress_enrollment on public.progress(enrollment_id);
create index idx_progress_lesson on public.progress(lesson_id);

create trigger progress_updated_at
  before update on public.progress
  for each row execute function public.update_updated_at();

-- Helper: calculate overall course progress for an enrollment
create or replace function public.get_enrollment_progress(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_enrollment public.enrollments;
  v_cohort public.cohorts;
  v_total_lessons integer;
  v_completed_lessons integer;
  v_total_sessions integer;
  v_attended_sessions integer;
begin
  select * into v_enrollment from public.enrollments where id = p_enrollment_id;
  if not found then return '{}'::jsonb; end if;

  select * into v_cohort from public.cohorts where id = v_enrollment.cohort_id;

  -- Count total published lessons in the course
  select count(*) into v_total_lessons
    from public.lessons l
    join public.weeks w on l.week_id = w.id
    where w.course_id = v_cohort.course_id
      and l.is_published = true
      and w.is_published = true;

  -- Count completed lessons for this enrollment
  select count(*) into v_completed_lessons
    from public.progress
    where enrollment_id = p_enrollment_id
      and is_completed = true;

  -- Count total live sessions
  select count(*) into v_total_sessions
    from public.live_sessions
    where cohort_id = v_cohort.id
      and status != 'cancelled';

  -- Count attended sessions
  select count(distinct la.session_id) into v_attended_sessions
    from public.live_attendance la
    join public.live_sessions ls on la.session_id = ls.id
    where la.user_id = v_enrollment.user_id
      and ls.cohort_id = v_cohort.id;

  return jsonb_build_object(
    'total_lessons', v_total_lessons,
    'completed_lessons', v_completed_lessons,
    'lessons_percent', case when v_total_lessons > 0 then round((v_completed_lessons::numeric / v_total_lessons) * 100) else 0 end,
    'total_sessions', v_total_sessions,
    'attended_sessions', v_attended_sessions,
    'attendance_percent', case when v_total_sessions > 0 then round((v_attended_sessions::numeric / v_total_sessions) * 100) else 0 end
  );
end;
$$;
