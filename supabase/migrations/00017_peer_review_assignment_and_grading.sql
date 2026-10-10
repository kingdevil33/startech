-- Migration: 00017_peer_review_assignment_and_grading
-- Two missing links in the peer review pipeline:
--   1) assign_peer_reviews(): picks reviewers when a student submits work
--   2) grade_submission_from_reviews(): aggregates reviews into final_score
-- Both are security definer so students can act on rows they do not own
-- (review_assignments are admin-only, submissions are owner-only under RLS).

-- ------------------------------------------------------------
-- Assign reviewers to a submission
-- ------------------------------------------------------------
create or replace function public.assign_peer_reviews(p_submission_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.submissions;
  v_assignment public.assignments;
  v_required integer;
  v_due timestamptz;
  v_created integer := 0;
  v_inserted integer;
  r record;
begin
  select * into v_submission from public.submissions where id = p_submission_id;
  if not found then
    raise exception 'Submission not found';
  end if;

  -- Cron/service-role calls have auth.uid() = null and are allowed through;
  -- for a logged-in user, only the submission owner may assign reviewers.
  if auth.uid() is not null
     and v_submission.user_id <> auth.uid()
     and not public.is_instructor_or_admin() then
    raise exception 'Not authorized to assign reviewers';
  end if;

  select * into v_assignment from public.assignments where id = v_submission.assignment_id;
  if not found or v_assignment.is_published is not true then
    return 0;
  end if;

  -- Cap the reviewers we place on a single submission
  v_required := least(greatest(coalesce(v_assignment.reviews_per_student, 1), 1), 5);

  -- Review window closes review_due_offset_days after the cohort week unlocks
  v_due := public.get_assignment_due_date(v_submission.assignment_id, v_submission.cohort_id)
           + ((v_assignment.review_due_offset_days - v_assignment.due_date_offset_days) * interval '1 day');

  -- Peers in the same cohort who submitted the same assignment, preferring
  -- students carrying the lightest pending review load
  for r in
    select s.user_id
    from public.submissions s
    where s.assignment_id = v_submission.assignment_id
      and s.cohort_id = v_submission.cohort_id
      and s.user_id <> v_submission.user_id
      and s.status in ('submitted', 'late', 'graded')
      and not exists (
        select 1
        from public.review_assignments ra
        where ra.submission_id = p_submission_id
          and ra.reviewer_id = s.user_id
      )
    order by
      (
        select count(*)
        from public.review_assignments ra2
        where ra2.reviewer_id = s.user_id
          and ra2.status = 'pending'
      ),
      random()
    limit v_required
  loop
    insert into public.review_assignments
      (submission_id, reviewer_id, cohort_id, assignment_id, status, due_at)
    values
      (p_submission_id, r.user_id, v_submission.cohort_id,
       v_submission.assignment_id, 'pending', v_due)
    on conflict (submission_id, reviewer_id) do nothing;

    get diagnostics v_inserted = row_count;
    v_created := v_created + v_inserted;
  end loop;

  return v_created;
end;
$$;

-- ------------------------------------------------------------
-- Grade a submission once enough peer reviews exist
-- ------------------------------------------------------------
create or replace function public.grade_submission_from_reviews(p_submission_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.submissions;
  v_assignment public.assignments;
  v_total integer;
  v_count integer;
  v_avg numeric;
  v_threshold integer;
begin
  select * into v_submission from public.submissions where id = p_submission_id;
  if not found then
    raise exception 'Submission not found';
  end if;

  if auth.uid() is not null
     and v_submission.user_id <> auth.uid()
     and not exists (
       select 1 from public.reviews r
       where r.submission_id = p_submission_id
         and r.reviewer_id = auth.uid()
     )
     and not public.is_instructor_or_admin() then
    raise exception 'Not authorized to grade this submission';
  end if;

  -- An instructor grade always wins
  if v_submission.instructor_override then
    return v_submission.final_score;
  end if;

  select * into v_assignment from public.assignments where id = v_submission.assignment_id;

  select count(*)
    into v_total
  from public.review_assignments
  where submission_id = p_submission_id;

  select count(*), avg(r.overall_score)
    into v_count, v_avg
  from public.reviews r
  where r.submission_id = p_submission_id;

  -- Grade as soon as reviews_per_student reviews exist, but never wait for
  -- more reviewers than were actually placed on this submission
  v_threshold := least(coalesce(v_assignment.reviews_per_student, 2), nullif(v_total, 0));
  if v_threshold is null or v_count < v_threshold then
    return v_submission.final_score;
  end if;

  update public.submissions
  set final_score = round(v_avg, 2),
      status = 'graded'::public.submission_status,
      updated_at = now()
  where id = p_submission_id
  returning final_score into v_avg;

  return v_avg;
end;
$$;

revoke execute on function public.assign_peer_reviews(uuid) from public, anon;
revoke execute on function public.grade_submission_from_reviews(uuid) from public, anon;

grant execute on function public.assign_peer_reviews(uuid) to authenticated, service_role;
grant execute on function public.grade_submission_from_reviews(uuid) to authenticated, service_role;
