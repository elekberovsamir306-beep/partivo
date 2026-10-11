-- Partivo.az — listings, images, contacts, favorites, views, reports, moderation, notifications.

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  ref_no bigint generated always as identity (start with 100001) unique,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'active', 'rejected', 'paused', 'sold', 'expired', 'removed')),

  title text not null default '' check (char_length(title) <= 90),
  slug text not null default 'elan',
  description text not null default '' check (char_length(description) <= 5000),
  price numeric(12, 2) check (price is null or (price >= 0 and price <= 10000000)),
  is_negotiable boolean not null default false,
  category_id bigint references public.categories (id) on delete restrict,
  condition text check (condition in ('new', 'used', 'refurbished')),
  city_slug text references public.cities (slug) on update cascade,

  make_id bigint references public.vehicle_makes (id) on delete set null,
  model_id bigint references public.vehicle_models (id) on delete set null,
  year_from smallint check (year_from between 1950 and 2100),
  year_to smallint check (year_to between 1950 and 2100),
  engine_type text check (engine_type in ('petrol', 'diesel', 'hybrid', 'electric', 'gas', 'other')),
  engine_volume numeric(3, 1) check (engine_volume between 0.5 and 10),
  oem_code text check (char_length(oem_code) <= 60),
  oem_normalized text generated always as (
    upper(regexp_replace(coalesce(oem_code, ''), '[^A-Za-z0-9]', '', 'g'))
  ) stored,
  manufacturer text check (char_length(manufacturer) <= 60),
  originality text check (originality in ('original', 'aftermarket')),
  compatibility_notes text check (char_length(compatibility_notes) <= 1000),

  delivery_available boolean not null default false,
  pickup_available boolean not null default true,
  delivery_notes text check (char_length(delivery_notes) <= 300),
  warranty_months smallint check (warranty_months between 0 and 120),
  warranty_notes text check (char_length(warranty_notes) <= 300),
  contact_method text not null default 'both' check (contact_method in ('phone', 'whatsapp', 'both')),

  -- System-managed columns (not writable by owners; see column grants).
  view_count integer not null default 0,
  favorite_count integer not null default 0,
  moderation_note text,
  flags text[] not null default '{}',
  search_extra text not null default '',
  published_at timestamptz,
  expires_at timestamptz,
  sold_at timestamptz,
  expiry_notified_at timestamptz,
  promo_top_until timestamptz,
  promo_vip_until timestamptz,
  promo_home_until timestamptz,
  promo_highlight_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', public.az_fold(title)), 'A')
    || setweight(to_tsvector('simple', public.az_fold(coalesce(oem_code, '') || ' ' || coalesce(manufacturer, ''))), 'A')
    || setweight(to_tsvector('simple', public.az_fold(search_extra)), 'B')
    || setweight(to_tsvector('simple', public.az_fold(left(description, 2000))), 'C')
  ) stored,

  check (year_from is null or year_to is null or year_from <= year_to)
);

create index listings_owner_idx on public.listings (owner_id, status);
create index listings_public_recent_idx on public.listings (published_at desc) where status = 'active';
create index listings_category_idx on public.listings (category_id) where status = 'active';
create index listings_make_model_idx on public.listings (make_id, model_id) where status = 'active';
create index listings_city_idx on public.listings (city_slug) where status = 'active';
create index listings_price_idx on public.listings (price) where status = 'active';
create index listings_views_idx on public.listings (view_count desc) where status = 'active';
create index listings_oem_idx on public.listings (oem_normalized) where status = 'active' and oem_normalized <> '';
create index listings_search_idx on public.listings using gin (search_vector);
create index listings_title_trgm_idx on public.listings using gin (public.az_fold(title) extensions.gin_trgm_ops);
create index listings_promo_top_idx on public.listings (promo_top_until) where promo_top_until is not null;
create index listings_promo_home_idx on public.listings (promo_home_until) where promo_home_until is not null;
create index listings_promo_vip_idx on public.listings (promo_vip_until) where promo_vip_until is not null;
create index listings_expires_idx on public.listings (expires_at) where status = 'active';

-- Keeps slug and denormalised search text current; resubmits edited live listings for moderation.
create or replace function public.listings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings jsonb := coalesce(public.get_setting('listings'), '{}'::jsonb);
begin
  new.slug := public.slugify(new.title);
  new.search_extra := pg_catalog.concat_ws(' ',
    (select name from public.vehicle_makes where id = new.make_id),
    (select name from public.vehicle_models where id = new.model_id),
    (select name from public.categories where id = new.category_id),
    new.compatibility_notes
  );

  if tg_op = 'UPDATE'
     and old.status = 'active'
     and new.status = 'active'
     and auth.uid() is not null
     and auth.uid() = old.owner_id
     and coalesce((settings ->> 'require_moderation')::boolean, true)
     and (
       new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.category_id is distinct from old.category_id
     )
  then
    new.status := 'pending';
    new.moderation_note := null;
  end if;

  return new;
end;
$$;

create trigger listings_before_write before insert or update on public.listings
  for each row execute function public.listings_before_write();
create trigger listings_updated_at before update on public.listings
  for each row execute function public.set_updated_at();

-- Contact phone is stored separately so public listing reads never expose it.
-- It is revealed through a rate-limited server endpoint for active listings only.
create table public.listing_contacts (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listing_contacts_owner_idx on public.listing_contacts (owner_id);
create trigger listing_contacts_updated_at before update on public.listing_contacts
  for each row execute function public.set_updated_at();

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  thumb_path text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  size_bytes integer not null check (size_bytes > 0),
  content_hash text not null,
  position smallint not null default 0 check (position between 0 and 49),
  created_at timestamptz not null default now()
);
create index listing_images_listing_idx on public.listing_images (listing_id, position);
create index listing_images_hash_idx on public.listing_images (content_hash);

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);

create or replace function public.favorites_count_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.listings set favorite_count = favorite_count + 1 where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update public.listings set favorite_count = greatest(favorite_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end;
$$;
create trigger favorites_count_sync after insert or delete on public.favorites
  for each row execute function public.favorites_count_sync();

-- One view per viewer fingerprint (salted hash computed server-side) per day.
create table public.listing_views (
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewer_hash text not null,
  day date not null default current_date,
  primary key (listing_id, viewer_hash, day)
);

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('fraud', 'prohibited', 'duplicate', 'wrong_category', 'wrong_price', 'already_sold', 'offensive', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, reporter_id)
);
create index listing_reports_status_idx on public.listing_reports (status, created_at desc);
create trigger listing_reports_updated_at before update on public.listing_reports
  for each row execute function public.set_updated_at();

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  listing_id uuid references public.listings (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('approve', 'reject', 'remove', 'restore', 'flag')),
  reason text,
  created_at timestamptz not null default now()
);
create index moderation_actions_listing_idx on public.moderation_actions (listing_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text check (link is null or link like '/%'),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create or replace function public.notify_user(
  target uuid, kind text, heading text, message text default null, href text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (target, kind, heading, message, href)
$$;

-- Public read model for listing cards. security_invoker => the caller's RLS applies.
-- Callers that want only public listings must filter on is_public (owners can see their drafts).
create view public.listing_cards
with (security_invoker = true)
as
select
  l.id,
  l.ref_no,
  l.slug,
  l.owner_id,
  l.status,
  l.title,
  l.price,
  l.is_negotiable,
  l.condition,
  l.category_id,
  c.name as category_name,
  c.slug as category_slug,
  l.city_slug,
  ci.name as city_name,
  l.make_id,
  mk.name as make_name,
  l.model_id,
  md.name as model_name,
  l.year_from,
  l.year_to,
  l.oem_code,
  l.delivery_available,
  l.view_count,
  l.favorite_count,
  l.published_at,
  l.expires_at,
  l.created_at,
  l.updated_at,
  coalesce(l.promo_top_until > now(), false) as is_top,
  coalesce(l.promo_vip_until > now(), false) as is_vip,
  coalesce(l.promo_home_until > now(), false) as is_premium,
  coalesce(l.promo_highlight_until > now(), false) as is_highlighted,
  p.display_name as seller_name,
  p.seller_type,
  p.is_verified as seller_verified,
  img.thumb_path as cover_thumb_path,
  img.storage_path as cover_path,
  coalesce(l.status = 'active' and l.expires_at > now() and not p.is_suspended, false) as is_public
from public.listings l
join public.profiles p on p.id = l.owner_id
left join public.categories c on c.id = l.category_id
left join public.cities ci on ci.slug = l.city_slug
left join public.vehicle_makes mk on mk.id = l.make_id
left join public.vehicle_models md on md.id = l.model_id
left join lateral (
  select li.thumb_path, li.storage_path
  from public.listing_images li
  where li.listing_id = l.id
  order by li.position, li.created_at
  limit 1
) img on true;
