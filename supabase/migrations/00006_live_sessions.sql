-- Migration: 00006_live_sessions
-- Platform-agnostic live sessions: Zoom, YouTube Live, TikTok, Custom

create type public.live_platform as enum ('zoom', 'youtube', 'tiktok', 'custom');
create type public.session_status as enum ('scheduled', 'live', 'completed', 'cancelled');

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  week_id uuid references public.weeks(id) on delete set null,

  -- Session details
  title text not null,
  description text,
  platform public.live_platform not null default 'zoom',
  status public.session_status not null default 'scheduled',

  -- Scheduling
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  ends_at timestamptz,

  -- Platform-specific data
  -- Zoom: meeting_id, join_url, start_url, passcode
  -- YouTube: broadcast_id, stream_url, embed_url
  -- TikTok: manual link
  -- Custom: any URL
  platform_data jsonb default '{}'::jsonb,

  -- Join URL (the student-facing link)
  join_url text,

  -- Recording after session
  recording_url text,
  recording_mux_asset_id uuid references public.mux_assets(id) on delete set null,

  -- Host
  host_id uuid references public.profiles(id) on delete set null,

  -- Reminders
  reminder_24h_sent boolean not null default false,
  reminder_1h_sent boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_live_sessions_cohort on public.live_sessions(cohort_id);
create index idx_live_sessions_week on public.live_sessions(week_id);
create index idx_live_sessions_scheduled on public.live_sessions(scheduled_at);
create index idx_live_sessions_status on public.live_sessions(status);

create or replace function public.set_session_ends_at()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.scheduled_at + make_interval(mins => new.duration_minutes);
  return new;
end;
$$;

create trigger live_sessions_set_ends_at
  before insert or update of scheduled_at, duration_minutes on public.live_sessions
  for each row execute function public.set_session_ends_at();

create trigger live_sessions_updated_at
  before update on public.live_sessions
  for each row execute function public.update_updated_at();

-- Attendance tracking
create table public.live_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  duration_minutes integer, -- calculated on leave
  source text default 'manual', -- 'zoom_webhook', 'manual', etc.
  created_at timestamptz not null default now(),

  constraint live_attendance_unique unique (session_id, user_id, joined_at)
);

create index idx_live_attendance_session on public.live_attendance(session_id);
create index idx_live_attendance_user on public.live_attendance(user_id);
