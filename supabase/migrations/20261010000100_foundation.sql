-- Partivo.az — foundation: extensions, helpers, reference tables, staff roles, settings, content.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Folds Azerbaijani text to lowercase ASCII so "Şin" matches "sin" and "Fəra" matches "fara".
-- Must stay in sync with foldAz() in src/lib/text.ts.
create or replace function public.az_fold(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select pg_catalog.lower(
    pg_catalog.translate(
      coalesce(input, ''),
      'ƏəĞğIıİiÖöÜüŞşÇç' || pg_catalog.chr(775),
      'EeGgIiIiOoUuSsCc'
    )
  )
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(
    nullif(
      pg_catalog.left(
        pg_catalog.btrim(pg_catalog.regexp_replace(public.az_fold(input), '[^a-z0-9]+', '-', 'g'), '-'),
        80
      ),
      ''
    ),
    'elan'
  )
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reference data: locations, categories, vehicles
-- ---------------------------------------------------------------------------

create table public.cities (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  name_i18n jsonb not null default '{}'::jsonb,
  region text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true
);

create table public.categories (
  id bigint generated always as identity primary key,
  parent_id bigint references public.categories (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 80),
  name_i18n jsonb not null default '{}'::jsonb,
  description text,
  icon text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_idx on public.categories (parent_id);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.vehicle_makes (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  is_popular boolean not null default false,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger vehicle_makes_updated_at before update on public.vehicle_makes
  for each row execute function public.set_updated_at();

create table public.vehicle_models (
  id bigint generated always as identity primary key,
  make_id bigint not null references public.vehicle_makes (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 60),
  year_from smallint check (year_from between 1950 and 2100),
  year_to smallint check (year_to between 1950 and 2100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (make_id, slug),
  check (year_from is null or year_to is null or year_from <= year_to)
);
create index vehicle_models_make_idx on public.vehicle_models (make_id);
create trigger vehicle_models_updated_at before update on public.vehicle_models
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Staff roles and permissions. Roles live in their own table that only
-- super-admins can change; they are never derived from a user-editable field.
-- ---------------------------------------------------------------------------

create table public.role_permissions (
  role text not null check (role in ('super_admin', 'moderator', 'support')),
  permission text not null,
  primary key (role, permission)
);

create table public.staff_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('super_admin', 'moderator', 'support')),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles sr
    join public.role_permissions rp on rp.role = sr.role
    where sr.user_id = auth.uid() and rp.permission = perm
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff_roles where user_id = auth.uid())
$$;

create or replace function public.my_permissions()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct rp.permission order by rp.permission), '{}')
  from public.staff_roles sr
  join public.role_permissions rp on rp.role = sr.role
  where sr.user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Platform settings and editable content
-- ---------------------------------------------------------------------------

create table public.app_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

create or replace function public.get_setting(setting_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select value from public.app_settings where key = setting_key
$$;

create table public.content_pages (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  body text not null default '',
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
create trigger content_pages_updated_at before update on public.content_pages
  for each row execute function public.set_updated_at();

create table public.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 160),
  body text,
  level text not null default 'info' check (level in ('info', 'warning', 'success')),
  link text check (link is null or link ~ '^(/|https://)'),
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
