-- Migration: 00013_ai_pgvector
-- RAG pipeline: pgvector for content chunks + AI conversations

-- Enable pgvector extension
create extension if not exists vector;

-- Content chunks for RAG
create table public.content_chunks (
  id uuid primary key default uuid_generate_v4(),
  
  -- Source reference
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  week_id uuid references public.weeks(id) on delete cascade,

  -- Content
  content text not null,
  content_type text not null check (content_type in ('lesson_text', 'transcript', 'resource')),
  
  -- Metadata for filtering
  metadata jsonb not null default '{}'::jsonb,
  -- {lesson_title, week_number, timestamp_start, timestamp_end, source_url}

  -- Embedding vector (1536 dimensions for text-embedding-3-small)
  embedding vector(1536),

  -- Chunk tracking
  chunk_index integer not null default 0,
  token_count integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- HNSW index for fast similarity search
create index idx_content_chunks_embedding on public.content_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index idx_content_chunks_course on public.content_chunks(course_id);
create index idx_content_chunks_lesson on public.content_chunks(lesson_id);
create index idx_content_chunks_week on public.content_chunks(week_id);
create index idx_content_chunks_type on public.content_chunks(content_type);

create trigger content_chunks_updated_at
  before update on public.content_chunks
  for each row execute function public.update_updated_at();

-- AI conversations
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  title text, -- auto-generated from first message
  message_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conversations_user on public.ai_conversations(user_id);
create index idx_ai_conversations_course on public.ai_conversations(course_id);

create trigger ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.update_updated_at();

-- AI messages
create table public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  
  -- Sources cited in the response
  sources jsonb default '[]'::jsonb,
  -- [{chunk_id, lesson_title, week_number, relevance_score, timestamp_link}]

  -- Token usage
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,

  -- Feedback
  feedback text check (feedback in ('up', 'down', null)),

  created_at timestamptz not null default now()
);

create index idx_ai_messages_conversation on public.ai_messages(conversation_id);
create index idx_ai_messages_feedback on public.ai_messages(feedback) where feedback is not null;

-- AI usage tracking (monthly budget per student)
create table public.ai_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  month_year text not null, -- "2024-01" format
  question_count integer not null default 0,
  total_tokens integer not null default 0,
  total_cost_usd numeric(8, 4) default 0,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_usage_unique unique (user_id, course_id, month_year)
);

create index idx_ai_usage_user on public.ai_usage(user_id);

create trigger ai_usage_updated_at
  before update on public.ai_usage
  for each row execute function public.update_updated_at();

-- Similarity search function
create or replace function public.search_content_chunks(
  p_query_embedding vector(1536),
  p_course_id uuid,
  p_unlocked_week_numbers integer[],
  p_limit integer default 5
)
returns table (
  id uuid,
  content text,
  content_type text,
  metadata jsonb,
  lesson_id uuid,
  week_id uuid,
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    cc.id,
    cc.content,
    cc.content_type,
    cc.metadata,
    cc.lesson_id,
    cc.week_id,
    1 - (cc.embedding <=> p_query_embedding) as similarity
  from public.content_chunks cc
  left join public.weeks w on cc.week_id = w.id
  where cc.course_id = p_course_id
    and cc.embedding is not null
    and (w.week_number is null or w.week_number = any(p_unlocked_week_numbers))
  order by cc.embedding <=> p_query_embedding
  limit p_limit;
end;
$$;
