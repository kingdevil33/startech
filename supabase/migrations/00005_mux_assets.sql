-- Migration: 00005_mux_assets
-- Tracks Mux video assets linked to lessons

create type public.mux_asset_status as enum ('waiting', 'preparing', 'ready', 'errored');

create table public.mux_assets (
  id uuid primary key default uuid_generate_v4(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,

  -- Mux identifiers
  mux_asset_id text unique,
  mux_upload_id text unique,
  mux_playback_id text, -- public playback ID (used with signed tokens)

  -- Status
  status public.mux_asset_status not null default 'waiting',
  error_message text,

  -- Video metadata
  duration_seconds numeric(10, 2),
  aspect_ratio text,
  resolution_tier text,
  max_resolution text,

  -- Captions / transcript
  captions_url text,
  transcript text, -- stored transcript for AI indexing

  -- Metadata
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_mux_assets_lesson on public.mux_assets(lesson_id);
create index idx_mux_assets_mux_id on public.mux_assets(mux_asset_id);
create index idx_mux_assets_upload_id on public.mux_assets(mux_upload_id);

create trigger mux_assets_updated_at
  before update on public.mux_assets
  for each row execute function public.update_updated_at();
