-- Partivo.az — user profiles.
-- profiles: public-facing seller data (safe to show on storefronts).
-- profile_private: personal data visible only to the owner and authorised staff.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  seller_type text not null default 'private' check (seller_type in ('private', 'business')),
  business_name text check (business_name is null or char_length(business_name) between 2 and 120),
  business_description text check (business_description is null or char_length(business_description) <= 1500),
  business_address text check (business_address is null or char_length(business_address) <= 200),
  avatar_path text,
  city_slug text references public.cities (slug) on update cascade,
  -- Trust flags: only staff may change these (enforced by column grants + RPCs).
  is_verified boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_seller_type_idx on public.profiles (seller_type) where not is_suspended;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  phone_verified_at timestamptz,
  default_contact_method text not null default 'both' check (default_contact_method in ('phone', 'whatsapp', 'both')),
  email_notifications boolean not null default true,
  suspended_reason text,
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

-- Create profile rows when Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text := pg_catalog.btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if char_length(requested_name) < 2 then
    requested_name := pg_catalog.split_part(coalesce(new.email, 'istifadəçi'), '@', 1);
  end if;
  if char_length(requested_name) < 2 then
    requested_name := 'İstifadəçi';
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, pg_catalog.left(requested_name, 80))
  on conflict (id) do nothing;

  insert into public.profile_private (id, email, phone, phone_verified_at)
  values (
    new.id,
    new.email,
    case when new.phone is not null and new.phone <> '' then '+' || pg_catalog.ltrim(new.phone, '+') end,
    new.phone_confirmed_at
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep email / verified phone in sync with Supabase Auth (the source of truth for verification).
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profile_private
  set
    email = new.email,
    phone = case
      when new.phone is not null and new.phone <> '' and new.phone_confirmed_at is not null
        then '+' || pg_catalog.ltrim(new.phone, '+')
      else phone
    end,
    phone_verified_at = case
      when new.phone is not null and new.phone <> '' then new.phone_confirmed_at
      else phone_verified_at
    end
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, phone, phone_confirmed_at on auth.users
  for each row execute function public.handle_auth_user_updated();

-- A user's own phone can only be changed through verification when it has been verified once.
create or replace function public.guard_profile_private()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() = new.id and new.phone is distinct from old.phone then
    -- Self-service phone edits always reset verification.
    new.phone_verified_at := null;
  end if;
  return new;
end;
$$;

create trigger profile_private_guard before update on public.profile_private
  for each row execute function public.guard_profile_private();
