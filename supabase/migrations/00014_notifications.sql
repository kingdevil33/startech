-- Migration: 00014_notifications
-- In-app + email notification system

create type public.notification_type as enum (
  'enrollment_confirmed',
  'session_reminder',
  'assignment_due',
  'review_assigned',
  'forum_reply',
  'forum_mention',
  'certificate_issued',
  'announcement',
  'refund_processed'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  
  -- Link to relevant resource
  link text,
  
  -- Related entities (for deduplication / grouping)
  cohort_id uuid references public.cohorts(id) on delete set null,
  
  -- Status
  is_read boolean not null default false,
  read_at timestamptz,
  
  -- Email tracking
  email_sent boolean not null default false,
  email_sent_at timestamptz,

  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;
create index idx_notifications_created on public.notifications(created_at desc);
create index idx_notifications_type on public.notifications(type);

-- Helper: create notification and optionally send email
create or replace function public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_cohort_id uuid default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, link, cohort_id)
  values (p_user_id, p_type, p_title, p_body, p_link, p_cohort_id)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;
