-- Migration: 00012_certificates
-- Auto-issued certificates with public verification

create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,

  -- Certificate data
  certificate_number text not null unique, -- e.g., "ST-2024-ABCD1234"
  student_name text not null,
  course_title text not null,
  cohort_name text not null,

  -- Completion data snapshot
  completion_data jsonb not null default '{}'::jsonb,
  -- {lessons_percent, attendance_percent, assignments_completed, reviews_completed}

  -- PDF
  pdf_url text,

  -- Status
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoke_reason text,
  is_revoked boolean not null default false,

  -- LinkedIn
  linkedin_url text, -- pre-built LinkedIn "Add to Profile" URL

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint certificates_enrollment_unique unique (enrollment_id)
);

create index idx_certificates_user on public.certificates(user_id);
create index idx_certificates_course on public.certificates(course_id);
create index idx_certificates_number on public.certificates(certificate_number);

create trigger certificates_updated_at
  before update on public.certificates
  for each row execute function public.update_updated_at();

-- Helper: generate certificate number
create or replace function public.generate_certificate_number()
returns text
language plpgsql
as $$
declare
  v_number text;
  v_exists boolean;
begin
  loop
    v_number := 'ST-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 8));
    select exists(select 1 from public.certificates where certificate_number = v_number) into v_exists;
    exit when not v_exists;
  end loop;
  return v_number;
end;
$$;
