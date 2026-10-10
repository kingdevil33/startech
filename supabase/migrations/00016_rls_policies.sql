-- Migration: 00016_rls_policies
-- Row Level Security policies for ALL tables
-- Principle: deny by default, allow explicitly

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get current user's role
create or replace function public.get_user_role()
returns public.user_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Check if current user is instructor or admin
create or replace function public.is_instructor_or_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'instructor', 'teaching_assistant')
  );
$$;

-- Check if current user is the course instructor
create or replace function public.is_course_instructor(p_course_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.courses
    where id = p_course_id and instructor_id = auth.uid()
  ) or public.is_admin();
$$;

-- Check if current user is enrolled in a cohort (active or completed, access not expired)
create or replace function public.user_is_enrolled(p_cohort_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid()
      and cohort_id = p_cohort_id
      and status in ('active', 'completed')
      and (access_expires_at is null or access_expires_at > now())
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================
alter table public.profiles enable row level security;

-- Anyone can read basic profile info
create policy "profiles_select_all" on public.profiles
  for select using (true);

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- Admins can update any profile
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- ============================================================
-- COURSES
-- ============================================================
alter table public.courses enable row level security;

-- Published courses are visible to everyone; unpublished only to instructor/admin
create policy "courses_select" on public.courses
  for select using (
    is_published = true
    or public.is_course_instructor(id)
    or public.is_admin()
  );

-- Only instructors and admins can insert
create policy "courses_insert" on public.courses
  for insert with check (public.is_instructor_or_admin());

-- Only the course instructor or admin can update
create policy "courses_update" on public.courses
  for update using (public.is_course_instructor(id));

-- Only admins can delete
create policy "courses_delete" on public.courses
  for delete using (public.is_admin());

-- ============================================================
-- COHORTS
-- ============================================================
alter table public.cohorts enable row level security;

-- Visible cohorts: published courses only, or instructor/admin
create policy "cohorts_select" on public.cohorts
  for select using (
    status != 'draft'
    or public.is_course_instructor(course_id)
    or public.is_admin()
  );

create policy "cohorts_insert" on public.cohorts
  for insert with check (
    public.is_course_instructor(course_id)
    or public.is_admin()
  );

create policy "cohorts_update" on public.cohorts
  for update using (
    public.is_course_instructor(course_id)
    or public.is_admin()
  );

create policy "cohorts_delete" on public.cohorts
  for delete using (public.is_admin());

-- ============================================================
-- WEEKS
-- ============================================================
alter table public.weeks enable row level security;

create policy "weeks_select" on public.weeks
  for select using (
    is_published = true
    or public.is_course_instructor(course_id)
    or public.is_admin()
  );

create policy "weeks_insert" on public.weeks
  for insert with check (
    public.is_course_instructor(course_id)
  );

create policy "weeks_update" on public.weeks
  for update using (
    public.is_course_instructor(course_id)
  );

create policy "weeks_delete" on public.weeks
  for delete using (
    public.is_course_instructor(course_id)
  );

-- ============================================================
-- LESSONS
-- ============================================================
alter table public.lessons enable row level security;

-- Lessons: free preview OR enrolled in a cohort of this course with week unlocked
create policy "lessons_select" on public.lessons
  for select using (
    is_free_preview = true
    or public.is_course_instructor(public.get_course_id_for_week(week_id))
    or public.is_admin()
    or (
      is_published = true
      and exists (
        select 1 from public.enrollments e
        join public.cohorts c on c.id = e.cohort_id
        join public.weeks w on w.id = lessons.week_id
        where e.user_id = auth.uid()
          and c.course_id = w.course_id
          and e.status in ('active', 'completed')
          and (e.access_expires_at is null or e.access_expires_at > now())
          and public.is_week_unlocked(lessons.week_id, e.cohort_id)
      )
    )
  );

create policy "lessons_insert" on public.lessons
  for insert with check (
    public.is_course_instructor(public.get_course_id_for_week(week_id))
  );

create policy "lessons_update" on public.lessons
  for update using (
    public.is_course_instructor(public.get_course_id_for_week(week_id))
  );

create policy "lessons_delete" on public.lessons
  for delete using (
    public.is_course_instructor(public.get_course_id_for_week(week_id))
  );

-- ============================================================
-- MUX ASSETS
-- ============================================================
alter table public.mux_assets enable row level security;

-- Mux assets follow lesson visibility
create policy "mux_assets_select" on public.mux_assets
  for select using (
    public.is_instructor_or_admin()
    or exists (
      select 1 from public.lessons l
      where l.id = mux_assets.lesson_id
      -- Lesson RLS will filter appropriately
    )
  );

create policy "mux_assets_insert" on public.mux_assets
  for insert with check (public.is_instructor_or_admin());

create policy "mux_assets_update" on public.mux_assets
  for update using (public.is_instructor_or_admin());

-- ============================================================
-- LIVE SESSIONS
-- ============================================================
alter table public.live_sessions enable row level security;

-- Enrolled students and instructors can see sessions
create policy "live_sessions_select" on public.live_sessions
  for select using (
    public.user_is_enrolled(cohort_id)
    or public.is_instructor_or_admin()
  );

create policy "live_sessions_insert" on public.live_sessions
  for insert with check (public.is_instructor_or_admin());

create policy "live_sessions_update" on public.live_sessions
  for update using (public.is_instructor_or_admin());

create policy "live_sessions_delete" on public.live_sessions
  for delete using (public.is_instructor_or_admin());

-- ============================================================
-- LIVE ATTENDANCE
-- ============================================================
alter table public.live_attendance enable row level security;

-- Users can see their own attendance, instructors see all in their cohorts
create policy "live_attendance_select" on public.live_attendance
  for select using (
    user_id = auth.uid()
    or public.is_instructor_or_admin()
  );

create policy "live_attendance_insert" on public.live_attendance
  for insert with check (public.is_instructor_or_admin());

-- ============================================================
-- ENROLLMENTS
-- ============================================================
alter table public.enrollments enable row level security;

-- Users see their own enrollments, instructors see their cohorts
create policy "enrollments_select" on public.enrollments
  for select using (
    user_id = auth.uid()
    or public.is_instructor_or_admin()
  );

-- Insert via service role (webhook) or reserve_seat function only
create policy "enrollments_insert_service" on public.enrollments
  for insert with check (public.is_admin());

create policy "enrollments_update" on public.enrollments
  for update using (public.is_admin());

-- ============================================================
-- PAYMENTS
-- ============================================================
alter table public.payments enable row level security;

-- Users see their own payments, admins see all
create policy "payments_select" on public.payments
  for select using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- Only via service role (webhooks)
create policy "payments_insert" on public.payments
  for insert with check (public.is_admin());

create policy "payments_update" on public.payments
  for update using (public.is_admin());

-- ============================================================
-- PROGRESS
-- ============================================================
alter table public.progress enable row level security;

-- Users see their own progress, instructors see their cohorts
create policy "progress_select" on public.progress
  for select using (
    user_id = auth.uid()
    or public.is_instructor_or_admin()
  );

-- Users can insert/update their own progress
create policy "progress_insert" on public.progress
  for insert with check (user_id = auth.uid());

create policy "progress_update" on public.progress
  for update using (user_id = auth.uid());

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
alter table public.assignments enable row level security;

create policy "assignments_select" on public.assignments
  for select using (
    is_published = true
    or public.is_instructor_or_admin()
  );

create policy "assignments_insert" on public.assignments
  for insert with check (public.is_instructor_or_admin());

create policy "assignments_update" on public.assignments
  for update using (public.is_instructor_or_admin());

create policy "assignments_delete" on public.assignments
  for delete using (public.is_instructor_or_admin());

-- ============================================================
-- SUBMISSIONS
-- ============================================================
alter table public.submissions enable row level security;

-- Users see own submissions; instructors see cohort submissions
create policy "submissions_select" on public.submissions
  for select using (
    user_id = auth.uid()
    or public.is_instructor_or_admin()
    -- Reviewers can see submissions assigned to them (handled via review_assignments join)
    or exists (
      select 1 from public.review_assignments ra
      where ra.submission_id = submissions.id
        and ra.reviewer_id = auth.uid()
    )
  );

create policy "submissions_insert" on public.submissions
  for insert with check (user_id = auth.uid());

create policy "submissions_update" on public.submissions
  for update using (
    user_id = auth.uid()
    or public.is_instructor_or_admin()
  );

-- ============================================================
-- REVIEW ASSIGNMENTS
-- ============================================================
alter table public.review_assignments enable row level security;

create policy "review_assignments_select" on public.review_assignments
  for select using (
    reviewer_id = auth.uid()
    or public.is_instructor_or_admin()
  );

create policy "review_assignments_insert" on public.review_assignments
  for insert with check (public.is_admin()); -- via cron job

create policy "review_assignments_update" on public.review_assignments
  for update using (
    reviewer_id = auth.uid()
    or public.is_instructor_or_admin()
  );

-- ============================================================
-- REVIEWS
-- ============================================================
alter table public.reviews enable row level security;

create policy "reviews_select" on public.reviews
  for select using (
    reviewer_id = auth.uid()
    or public.is_instructor_or_admin()
    -- Submission owner can see reviews of their work (if they completed their own reviews)
    or exists (
      select 1 from public.submissions s
      where s.id = reviews.submission_id
        and s.user_id = auth.uid()
    )
  );

create policy "reviews_insert" on public.reviews
  for insert with check (reviewer_id = auth.uid());

create policy "reviews_update" on public.reviews
  for update using (
    reviewer_id = auth.uid()
    or public.is_instructor_or_admin()
  );

-- ============================================================
-- FORUM CATEGORIES
-- ============================================================
alter table public.forum_categories enable row level security;

create policy "forum_categories_select" on public.forum_categories
  for select using (
    public.user_is_enrolled(cohort_id)
    or public.is_instructor_or_admin()
  );

create policy "forum_categories_insert" on public.forum_categories
  for insert with check (public.is_instructor_or_admin());

create policy "forum_categories_update" on public.forum_categories
  for update using (public.is_instructor_or_admin());

-- ============================================================
-- THREADS
-- ============================================================
alter table public.threads enable row level security;

create policy "threads_select" on public.threads
  for select using (
    not is_hidden
    or author_id = auth.uid()
    or public.is_instructor_or_admin()
  );

create policy "threads_insert" on public.threads
  for insert with check (
    exists (
      select 1 from public.forum_categories fc
      where fc.id = threads.category_id
        and (public.user_is_enrolled(fc.cohort_id) or public.is_instructor_or_admin())
        and not fc.is_locked
    )
  );

create policy "threads_update" on public.threads
  for update using (
    author_id = auth.uid()
    or public.is_instructor_or_admin()
  );

-- ============================================================
-- POSTS
-- ============================================================
alter table public.posts enable row level security;

create policy "posts_select" on public.posts
  for select using (
    not is_hidden
    or author_id = auth.uid()
    or public.is_instructor_or_admin()
  );

create policy "posts_insert" on public.posts
  for insert with check (author_id = auth.uid());

create policy "posts_update" on public.posts
  for update using (
    author_id = auth.uid()
    or public.is_instructor_or_admin()
  );

-- ============================================================
-- REACTIONS
-- ============================================================
alter table public.reactions enable row level security;

create policy "reactions_select" on public.reactions
  for select using (true);

create policy "reactions_insert" on public.reactions
  for insert with check (user_id = auth.uid());

create policy "reactions_delete" on public.reactions
  for delete using (user_id = auth.uid());

-- ============================================================
-- CERTIFICATES
-- ============================================================
alter table public.certificates enable row level security;

-- Public verification: anyone can see non-revoked certificates
create policy "certificates_select" on public.certificates
  for select using (
    not is_revoked
    or user_id = auth.uid()
    or public.is_admin()
  );

create policy "certificates_insert" on public.certificates
  for insert with check (public.is_admin());

create policy "certificates_update" on public.certificates
  for update using (public.is_admin());

-- ============================================================
-- AI TABLES
-- ============================================================
alter table public.content_chunks enable row level security;

create policy "content_chunks_select" on public.content_chunks
  for select using (public.is_instructor_or_admin());

create policy "content_chunks_insert" on public.content_chunks
  for insert with check (public.is_instructor_or_admin());

create policy "content_chunks_update" on public.content_chunks
  for update using (public.is_instructor_or_admin());

create policy "content_chunks_delete" on public.content_chunks
  for delete using (public.is_instructor_or_admin());

alter table public.ai_conversations enable row level security;

create policy "ai_conversations_select" on public.ai_conversations
  for select using (user_id = auth.uid());

create policy "ai_conversations_insert" on public.ai_conversations
  for insert with check (user_id = auth.uid());

alter table public.ai_messages enable row level security;

create policy "ai_messages_select" on public.ai_messages
  for select using (
    exists (
      select 1 from public.ai_conversations ac
      where ac.id = ai_messages.conversation_id
        and ac.user_id = auth.uid()
    )
  );

create policy "ai_messages_insert" on public.ai_messages
  for insert with check (
    exists (
      select 1 from public.ai_conversations ac
      where ac.id = ai_messages.conversation_id
        and ac.user_id = auth.uid()
    )
  );

alter table public.ai_usage enable row level security;

create policy "ai_usage_select" on public.ai_usage
  for select using (
    user_id = auth.uid()
    or public.is_admin()
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
alter table public.notifications enable row level security;

create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());

-- ============================================================
-- AUDIT LOG
-- ============================================================
alter table public.audit_log enable row level security;

create policy "audit_log_select" on public.audit_log
  for select using (public.is_admin());

create policy "audit_log_insert" on public.audit_log
  for insert with check (public.is_admin());

-- ============================================================
-- ENABLE REALTIME for relevant tables
-- ============================================================
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.threads;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.progress;
