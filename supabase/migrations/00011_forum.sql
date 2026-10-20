-- Migration: 00011_forum
-- Discussion forum: categories, threads, posts (nested), reactions

create table public.forum_categories (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_locked boolean not null default false,

  -- Optional: link to a specific lesson
  lesson_id uuid references public.lessons(id) on delete set null,

  created_at timestamptz not null default now()
);

create index idx_forum_categories_cohort on public.forum_categories(cohort_id);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.forum_categories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null, -- markdown
  
  -- Moderation
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  is_hidden boolean not null default false,
  
  -- Accepted answer
  accepted_post_id uuid, -- set after posts table is created
  
  -- Counters (denormalized for performance)
  reply_count integer not null default 0,
  view_count integer not null default 0,
  last_activity_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_threads_category on public.threads(category_id);
create index idx_threads_author on public.threads(author_id);
create index idx_threads_pinned on public.threads(is_pinned) where is_pinned = true;
create index idx_threads_last_activity on public.threads(last_activity_at desc);

create trigger threads_updated_at
  before update on public.threads
  for each row execute function public.update_updated_at();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.posts(id) on delete cascade, -- for nested replies
  content text not null, -- markdown
  
  -- Moderation
  is_hidden boolean not null default false,
  is_reported boolean not null default false,
  report_reason text,
  
  -- Edit tracking
  is_edited boolean not null default false,
  edited_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_posts_thread on public.posts(thread_id);
create index idx_posts_author on public.posts(author_id);
create index idx_posts_parent on public.posts(parent_id);

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.update_updated_at();

-- Add foreign key for accepted_post_id now that posts table exists
alter table public.threads
  add constraint threads_accepted_post_fk
  foreign key (accepted_post_id)
  references public.posts(id) on delete set null;

-- Reactions on posts
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null, -- '👍', '❤️', '🎉', '🤔', '👀'

  created_at timestamptz not null default now(),

  constraint reactions_unique unique (post_id, user_id, emoji)
);

create index idx_reactions_post on public.reactions(post_id);

-- Trigger to update thread reply_count and last_activity_at
create or replace function public.update_thread_on_post()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    update public.threads
      set reply_count = reply_count + 1,
          last_activity_at = now()
      where id = new.thread_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.threads
      set reply_count = greatest(0, reply_count - 1)
      where id = old.thread_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_post_change
  after insert or delete on public.posts
  for each row execute function public.update_thread_on_post();
