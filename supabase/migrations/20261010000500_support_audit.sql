-- Partivo.az — support requests, audit log and rate limiting.

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  topic text not null default 'general' check (topic in ('general', 'account', 'listing', 'payment', 'report', 'business', 'other')),
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  staff_note text,
  assigned_to uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_requests_status_idx on public.support_requests (status, created_at desc);
create trigger support_requests_updated_at before update on public.support_requests
  for each row execute function public.set_updated_at();

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.write_audit(
  act text, entity text, entity_ref text, info jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), act, entity, entity_ref, coalesce(info, '{}'::jsonb))
$$;

-- Generic audit trigger for staff-managed configuration tables.
create or replace function public.audit_table_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref text;
begin
  if tg_op = 'DELETE' then
    ref := coalesce(pg_catalog.to_jsonb(old) ->> 'id', pg_catalog.to_jsonb(old) ->> 'key', pg_catalog.to_jsonb(old) ->> 'slug', pg_catalog.to_jsonb(old) ->> 'user_id');
    perform public.write_audit(pg_catalog.lower(tg_op), tg_table_name, ref, pg_catalog.jsonb_build_object('old', pg_catalog.to_jsonb(old)));
    return old;
  end if;
  ref := coalesce(pg_catalog.to_jsonb(new) ->> 'id', pg_catalog.to_jsonb(new) ->> 'key', pg_catalog.to_jsonb(new) ->> 'slug', pg_catalog.to_jsonb(new) ->> 'user_id');
  perform public.write_audit(
    pg_catalog.lower(tg_op), tg_table_name, ref,
    case when tg_op = 'UPDATE'
      then pg_catalog.jsonb_build_object('old', pg_catalog.to_jsonb(old), 'new', pg_catalog.to_jsonb(new))
      else pg_catalog.jsonb_build_object('new', pg_catalog.to_jsonb(new))
    end
  );
  return new;
end;
$$;

create trigger audit_categories after insert or update or delete on public.categories
  for each row execute function public.audit_table_change();
create trigger audit_vehicle_makes after insert or update or delete on public.vehicle_makes
  for each row execute function public.audit_table_change();
create trigger audit_vehicle_models after insert or update or delete on public.vehicle_models
  for each row execute function public.audit_table_change();
create trigger audit_promotion_packages after insert or update or delete on public.promotion_packages
  for each row execute function public.audit_table_change();
create trigger audit_app_settings after insert or update or delete on public.app_settings
  for each row execute function public.audit_table_change();
create trigger audit_content_pages after insert or update or delete on public.content_pages
  for each row execute function public.audit_table_change();
create trigger audit_announcements after insert or update or delete on public.announcements
  for each row execute function public.audit_table_change();
create trigger audit_staff_roles after insert or update or delete on public.staff_roles
  for each row execute function public.audit_table_change();

-- Fixed-window rate limiter shared by all server instances. Only the service role may call it.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.rate_limit_hit(bucket text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  win timestamptz := pg_catalog.to_timestamp(
    pg_catalog.floor(extract(epoch from pg_catalog.now()) / window_seconds) * window_seconds
  );
  current_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (bucket, win, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into current_hits;
  return current_hits <= max_hits;
end;
$$;
