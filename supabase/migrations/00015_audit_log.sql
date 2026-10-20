-- Migration: 00015_audit_log
-- Audit log for admin actions

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null, -- e.g., 'enrollment.created', 'refund.issued', 'certificate.revoked'
  entity_type text, -- 'enrollment', 'payment', 'cohort', 'user', etc.
  entity_id uuid,
  
  -- Details
  details jsonb default '{}'::jsonb,
  -- Stores old/new values for audit trail
  
  -- Request context
  ip_address inet,
  user_agent text,

  created_at timestamptz not null default now()
);

create index idx_audit_log_actor on public.audit_log(actor_id);
create index idx_audit_log_action on public.audit_log(action);
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_created on public.audit_log(created_at desc);

-- Helper: log an audit event
create or replace function public.log_audit(
  p_actor_id uuid,
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_log_id uuid;
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (p_actor_id, p_action, p_entity_type, p_entity_id, p_details)
  returning id into v_log_id;

  return v_log_id;
end;
$$;
