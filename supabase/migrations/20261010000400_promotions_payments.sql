-- Partivo.az — paid promotion packages, orders and payments.
-- Card data is never stored. Only the masked card number returned by the provider is kept.

create table public.promotion_packages (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9_-]{2,32}$'),
  name text not null check (char_length(name) between 2 and 60),
  name_i18n jsonb not null default '{}'::jsonb,
  description text not null default '',
  features text[] not null default '{}',
  price numeric(10, 2) not null check (price > 0 and price <= 10000),
  currency text not null default 'AZN' check (currency = 'AZN'),
  duration_days integer not null check (duration_days between 1 and 365),
  placements text[] not null
    check (placements <@ array['search_top', 'vip_section', 'homepage', 'highlight']::text[] and cardinality(placements) > 0),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger promotion_packages_updated_at before update on public.promotion_packages
  for each row execute function public.set_updated_at();

create table public.promotion_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  package_id bigint references public.promotion_packages (id) on delete set null,
  -- Price, duration and placements are snapshotted at checkout so later package edits never change a paid order.
  package_snapshot jsonb not null,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'AZN',
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'expired', 'failed', 'cancelled', 'refunded')),
  starts_at timestamptz,
  ends_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index promotion_orders_user_idx on public.promotion_orders (user_id, created_at desc);
create index promotion_orders_listing_idx on public.promotion_orders (listing_id);
create index promotion_orders_active_idx on public.promotion_orders (ends_at) where status = 'active';
create trigger promotion_orders_updated_at before update on public.promotion_orders
  for each row execute function public.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.promotion_orders (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  provider text not null check (provider in ('epoint', 'mock')),
  provider_transaction text,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'AZN',
  status text not null default 'created'
    check (status in ('created', 'pending', 'succeeded', 'failed', 'refunded', 'cancelled')),
  provider_status text,
  provider_code text,
  provider_message text,
  card_mask text check (card_mask is null or card_mask ~ '^[0-9]{6}\*+[0-9]{4}$'),
  rrn text,
  confirmed_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_transaction)
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_order_idx on public.payments (order_id);
create index payments_pending_idx on public.payments (created_at) where status in ('created', 'pending');
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- Every inbound callback / status check is logged for reconciliation and dispute handling.
create table public.payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid references public.payments (id) on delete set null,
  source text not null check (source in ('callback', 'status_check', 'initiation', 'admin')),
  signature_valid boolean,
  provider_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index payment_events_payment_idx on public.payment_events (payment_id, created_at desc);
