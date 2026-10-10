-- Migration: 00001_profiles
-- Creates the profiles table linked to auth.users
-- Auto-populates on signup via trigger

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Roles enum
create type public.user_role as enum (
  'admin',
  'instructor',
  'teaching_assistant',
  'student'
);

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'student',
  bio text,
  timezone text default 'UTC',
  notification_preferences jsonb default '{"email": true, "in_app": true}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookups
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_role on public.profiles(role);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at trigger function
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
