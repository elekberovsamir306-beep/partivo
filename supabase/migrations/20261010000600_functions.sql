-- Partivo.az — business logic executed inside the database so rules hold no matter which client calls them.
-- Errors are raised with stable machine-readable messages that the app maps to Azerbaijani text.

-- ---------------------------------------------------------------------------
-- Listing lifecycle (owner)
-- ---------------------------------------------------------------------------

create or replace function public.listing_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'duration_days', 30,
    'renewal_window_days', 5,
    'max_active_per_user', 50,
    'min_photos', 5,
    'max_photos', 10,
    'require_moderation', true
  ) || coalesce(public.get_setting('listings'), '{}'::jsonb)
$$;

create or replace function public.publish_listing(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  l public.listings%rowtype;
  s jsonb := public.listing_settings();
  photo_count integer;
  open_count integer;
  max_active integer;
  reused_images boolean;
  next_status text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into l from public.listings where id = p_listing_id for update;
  if not found or l.owner_id <> uid then
    raise exception 'not_found';
  end if;
  if exists (select 1 from public.profiles where id = uid and is_suspended) then
    raise exception 'account_suspended';
  end if;
  if l.status not in ('draft', 'rejected') then
    raise exception 'invalid_status';
  end if;

  if char_length(pg_catalog.btrim(l.title)) < 5
     or char_length(pg_catalog.btrim(l.description)) < 20
     or l.price is null
     or l.category_id is null
     or l.condition is null
     or l.city_slug is null then
    raise exception 'incomplete_listing';
  end if;

  if not exists (select 1 from public.listing_contacts where listing_id = l.id) then
    raise exception 'missing_contact';
  end if;

  select count(*) into photo_count from public.listing_images where listing_id = l.id;
  if photo_count < (s ->> 'min_photos')::integer then
    raise exception 'not_enough_photos';
  end if;
  if photo_count > (s ->> 'max_photos')::integer then
    raise exception 'too_many_photos';
  end if;

  max_active := (s ->> 'max_active_per_user')::integer;
  select count(*) into open_count
    from public.listings
    where owner_id = uid and status in ('active', 'pending') and id <> l.id;
  if open_count >= max_active then
    raise exception 'listing_limit_reached';
  end if;

  -- Duplicate detection: same owner, same category, same (folded) title still on the market.
  if exists (
    select 1 from public.listings
    where owner_id = uid
      and id <> l.id
      and status in ('active', 'pending', 'paused')
      and category_id = l.category_id
      and public.az_fold(pg_catalog.btrim(title)) = public.az_fold(pg_catalog.btrim(l.title))
  ) then
    raise exception 'duplicate_listing';
  end if;

  -- Photos identical to another seller's photos are a common scam signal: force manual review.
  reused_images := exists (
    select 1
    from public.listing_images a
    join public.listing_images b on b.content_hash = a.content_hash and b.owner_id <> a.owner_id
    where a.listing_id = l.id
  );

  if (s ->> 'require_moderation')::boolean or reused_images then
    next_status := 'pending';
  else
    next_status := 'active';
  end if;

  update public.listings
  set
    status = next_status,
    moderation_note = null,
    flags = case
      when reused_images then array(select distinct f from unnest(flags || array['reused_images']) f)
      else array_remove(flags, 'reused_images')
    end,
    published_at = case when next_status = 'active' then now() else published_at end,
    expires_at = case
      when next_status = 'active' then now() + pg_catalog.make_interval(days => (s ->> 'duration_days')::integer)
      else expires_at
    end
  where id = l.id;

  return next_status;
end;
$$;

create or replace function public.change_listing_status(p_listing_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  l public.listings%rowtype;
  s jsonb := public.listing_settings();
  window_days integer := (s ->> 'renewal_window_days')::integer;
  next_status text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into l from public.listings where id = p_listing_id for update;
  if not found or l.owner_id <> uid then
    raise exception 'not_found';
  end if;
  if exists (select 1 from public.profiles where id = uid and is_suspended) then
    raise exception 'account_suspended';
  end if;

  case p_action
    when 'pause' then
      if l.status <> 'active' then raise exception 'invalid_status'; end if;
      next_status := 'paused';
      update public.listings set status = next_status where id = l.id;

    when 'resume' then
      if l.status <> 'paused' then raise exception 'invalid_status'; end if;
      if l.expires_at is null or l.expires_at <= now() then raise exception 'listing_expired'; end if;
      next_status := 'active';
      update public.listings set status = next_status where id = l.id;

    when 'mark_sold' then
      if l.status not in ('active', 'paused', 'expired') then raise exception 'invalid_status'; end if;
      next_status := 'sold';
      update public.listings set status = next_status, sold_at = now() where id = l.id;

    when 'renew' then
      if l.status = 'expired' or (l.status in ('active', 'expired') and l.expires_at is not null and l.expires_at <= now()) then
        null;
      elsif l.status = 'active' and l.expires_at <= now() + pg_catalog.make_interval(days => window_days) then
        null;
      elsif l.status = 'active' then
        raise exception 'renewal_not_available';
      else
        raise exception 'invalid_status';
      end if;
      next_status := 'active';
      update public.listings
      set status = next_status,
          expires_at = now() + pg_catalog.make_interval(days => (s ->> 'duration_days')::integer),
          expiry_notified_at = null
      where id = l.id;

    when 'withdraw' then
      if l.status <> 'pending' then raise exception 'invalid_status'; end if;
      next_status := 'draft';
      update public.listings set status = next_status where id = l.id;

    else
      raise exception 'invalid_action';
  end case;

  return next_status;
end;
$$;

-- Atomically reorder images; position 0 is the primary (cover) image. Runs with caller rights (RLS applies).
create or replace function public.reorder_listing_images(p_listing_id uuid, p_image_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing integer;
begin
  select count(*) into existing from public.listing_images where listing_id = p_listing_id;
  if existing <> cardinality(p_image_ids)
     or existing <> (select count(*) from public.listing_images where listing_id = p_listing_id and id = any (p_image_ids)) then
    raise exception 'image_set_mismatch';
  end if;

  update public.listing_images li
  set position = (o.ord - 1)::smallint
  from unnest(p_image_ids) with ordinality as o (image_id, ord)
  where li.id = o.image_id and li.listing_id = p_listing_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Views and maintenance (service role only)
-- ---------------------------------------------------------------------------

create or replace function public.record_listing_view(p_listing_id uuid, p_viewer_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  insert into public.listing_views (listing_id, viewer_hash)
  select p_listing_id, p_viewer_hash
  where exists (select 1 from public.listings where id = p_listing_id and status = 'active')
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    update public.listings set view_count = view_count + 1 where id = p_listing_id;
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.recompute_listing_promotions(p_listing_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listings l
  set
    promo_top_until = (select max(o.ends_at) from public.promotion_orders o
      where o.listing_id = l.id and o.status = 'active' and o.package_snapshot -> 'placements' ? 'search_top'),
    promo_vip_until = (select max(o.ends_at) from public.promotion_orders o
      where o.listing_id = l.id and o.status = 'active' and o.package_snapshot -> 'placements' ? 'vip_section'),
    promo_home_until = (select max(o.ends_at) from public.promotion_orders o
      where o.listing_id = l.id and o.status = 'active' and o.package_snapshot -> 'placements' ? 'homepage'),
    promo_highlight_until = (select max(o.ends_at) from public.promotion_orders o
      where o.listing_id = l.id and o.status = 'active' and o.package_snapshot -> 'placements' ? 'highlight')
  where l.id = p_listing_id
$$;

create or replace function public.run_maintenance()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_listings integer := 0;
  expiring_notified integer := 0;
  expired_orders integer := 0;
  r record;
begin
  for r in
    update public.listings
    set status = 'expired'
    where status = 'active' and expires_at <= now()
    returning id, owner_id, title
  loop
    expired_listings := expired_listings + 1;
    perform public.notify_user(r.owner_id, 'listing_expired', 'Elanın müddəti bitdi',
      pg_catalog.format('"%s" elanının müddəti bitdi. Onu yeniləyərək yenidən aktiv edə bilərsiniz.', r.title),
      '/hesab/elanlar');
  end loop;

  for r in
    update public.listings
    set expiry_notified_at = now()
    where status = 'active'
      and expiry_notified_at is null
      and expires_at <= now() + interval '3 days'
    returning id, owner_id, title
  loop
    expiring_notified := expiring_notified + 1;
    perform public.notify_user(r.owner_id, 'listing_expiring', 'Elanın müddəti bitmək üzrədir',
      pg_catalog.format('"%s" elanının müddəti 3 gün ərzində bitəcək.', r.title), '/hesab/elanlar');
  end loop;

  for r in
    update public.promotion_orders
    set status = 'expired'
    where status = 'active' and ends_at <= now()
    returning id, user_id, listing_id, package_snapshot
  loop
    expired_orders := expired_orders + 1;
    if r.listing_id is not null then
      perform public.recompute_listing_promotions(r.listing_id);
    end if;
    if r.user_id is not null then
      perform public.notify_user(r.user_id, 'promotion_expired', 'Reklam müddəti bitdi',
        pg_catalog.format('%s xidmətinin müddəti başa çatdı.', r.package_snapshot ->> 'name'), '/hesab/odenisler');
    end if;
  end loop;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.listing_views where day < current_date - 2;

  return pg_catalog.jsonb_build_object(
    'expired_listings', expired_listings,
    'expiring_notified', expiring_notified,
    'expired_orders', expired_orders
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Promotions and payments (service role only — prices always come from the database)
-- ---------------------------------------------------------------------------

create or replace function public.create_promotion_order(
  p_user_id uuid, p_listing_id uuid, p_package_id bigint, p_provider text
)
returns table (order_id uuid, payment_id uuid, amount numeric, currency text, package_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pkg public.promotion_packages%rowtype;
  l public.listings%rowtype;
  new_order uuid;
  new_payment uuid;
begin
  if p_provider not in ('epoint', 'mock') then
    raise exception 'invalid_provider';
  end if;
  select * into pkg from public.promotion_packages where id = p_package_id and is_active;
  if not found then
    raise exception 'package_unavailable';
  end if;
  select * into l from public.listings where id = p_listing_id;
  if not found or l.owner_id <> p_user_id then
    raise exception 'not_found';
  end if;
  if l.status <> 'active' or l.expires_at <= now() then
    raise exception 'listing_not_active';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and is_suspended) then
    raise exception 'account_suspended';
  end if;

  insert into public.promotion_orders (user_id, listing_id, package_id, package_snapshot, amount, currency)
  values (
    p_user_id, l.id, pkg.id,
    pg_catalog.jsonb_build_object(
      'code', pkg.code, 'name', pkg.name, 'price', pkg.price,
      'duration_days', pkg.duration_days, 'placements', pg_catalog.to_jsonb(pkg.placements)
    ),
    pkg.price, pkg.currency
  )
  returning id into new_order;

  insert into public.payments (order_id, user_id, provider, amount, currency)
  values (new_order, p_user_id, p_provider, pkg.price, pkg.currency)
  returning id into new_payment;

  return query select new_order, new_payment, pkg.price, pkg.currency, pkg.name;
end;
$$;

create or replace function public.attach_provider_transaction(p_payment_id uuid, p_transaction text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payments
  set provider_transaction = p_transaction, status = 'pending'
  where id = p_payment_id and status = 'created'
$$;

-- Idempotent: safe to call repeatedly for the same callback. Activates the promotion exactly once.
create or replace function public.confirm_payment(
  p_payment_id uuid,
  p_provider_transaction text,
  p_amount numeric,
  p_currency text,
  p_provider_status text,
  p_code text default null,
  p_message text default null,
  p_card_mask text default null,
  p_rrn text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public.payments%rowtype;
  ord public.promotion_orders%rowtype;
  placements text[];
  duration integer;
  start_at timestamptz;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found';
  end if;
  if pay.status = 'succeeded' then
    return 'already_processed';
  end if;
  if pay.status in ('refunded', 'cancelled') then
    return 'ignored';
  end if;
  if pay.provider_transaction is not null and p_provider_transaction is not null
     and pay.provider_transaction <> p_provider_transaction then
    raise exception 'transaction_mismatch';
  end if;

  if p_amount is null or round(p_amount, 2) <> pay.amount or coalesce(p_currency, pay.currency) <> pay.currency then
    update public.payments
    set status = 'failed', provider_status = p_provider_status, provider_code = p_code,
        provider_message = 'amount_mismatch', last_checked_at = now()
    where id = pay.id;
    update public.promotion_orders set status = 'failed' where id = pay.order_id and status = 'pending_payment';
    return 'amount_mismatch';
  end if;

  update public.payments
  set status = 'succeeded',
      provider_transaction = coalesce(p_provider_transaction, provider_transaction),
      provider_status = p_provider_status,
      provider_code = p_code,
      provider_message = p_message,
      card_mask = case when p_card_mask ~ '^[0-9]{6}\*+[0-9]{4}$' then p_card_mask end,
      rrn = p_rrn,
      confirmed_at = now(),
      last_checked_at = now()
  where id = pay.id;

  select * into ord from public.promotion_orders where id = pay.order_id for update;

  if ord.listing_id is null or not exists (
    select 1 from public.listings where id = ord.listing_id and status in ('active', 'paused')
  ) then
    -- Paid but the listing is gone: keep the money trail, flag for manual refund.
    update public.promotion_orders set status = 'cancelled', paid_at = now() where id = ord.id;
    perform public.write_audit('payment_requires_refund', 'promotion_orders', ord.id::text,
      pg_catalog.jsonb_build_object('payment_id', pay.id, 'reason', 'listing_unavailable'));
    if ord.user_id is not null then
      perform public.notify_user(ord.user_id, 'payment_attention', 'Ödəniş qəbul edildi, lakin elan aktiv deyil',
        'Dəstək komandamız sizinlə əlaqə saxlayacaq və geri ödəniş məsələsini həll edəcək.', '/hesab/odenisler');
    end if;
    return 'requires_refund';
  end if;

  select array(select pg_catalog.jsonb_array_elements_text(ord.package_snapshot -> 'placements')) into placements;
  duration := (ord.package_snapshot ->> 'duration_days')::integer;

  -- Stack on top of any running promotion with overlapping placements.
  select greatest(now(), coalesce(max(o.ends_at), now()))
    into start_at
    from public.promotion_orders o
    where o.listing_id = ord.listing_id
      and o.status = 'active'
      and o.id <> ord.id
      and exists (
        select 1 from pg_catalog.jsonb_array_elements_text(o.package_snapshot -> 'placements') p
        where p = any (placements)
      );

  update public.promotion_orders
  set status = 'active',
      paid_at = now(),
      starts_at = start_at,
      ends_at = start_at + pg_catalog.make_interval(days => duration)
  where id = ord.id;

  perform public.recompute_listing_promotions(ord.listing_id);

  if ord.user_id is not null then
    perform public.notify_user(ord.user_id, 'promotion_active', 'Reklam aktivləşdirildi',
      pg_catalog.format('%s xidməti %s günlük aktivləşdirildi.', ord.package_snapshot ->> 'name', duration),
      '/hesab/odenisler');
  end if;

  return 'activated';
end;
$$;

create or replace function public.fail_payment(
  p_payment_id uuid, p_provider_status text, p_code text default null, p_message text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public.payments%rowtype;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found';
  end if;
  if pay.status not in ('created', 'pending') then
    return 'already_processed';
  end if;
  update public.payments
  set status = 'failed', provider_status = p_provider_status, provider_code = p_code,
      provider_message = p_message, last_checked_at = now()
  where id = pay.id;
  update public.promotion_orders set status = 'failed' where id = pay.order_id and status = 'pending_payment';
  if pay.user_id is not null then
    perform public.notify_user(pay.user_id, 'payment_failed', 'Ödəniş uğursuz oldu',
      'Ödəniş tamamlanmadı, hesabınızdan vəsait silinməyib. Yenidən cəhd edə bilərsiniz.', '/hesab/odenisler');
  end if;
  return 'failed';
end;
$$;

create or replace function public.refund_payment(p_payment_id uuid, p_note text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public.payments%rowtype;
  ord_listing uuid;
begin
  select * into pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found';
  end if;
  if pay.status = 'refunded' then
    return 'already_processed';
  end if;
  if pay.status <> 'succeeded' then
    raise exception 'invalid_status';
  end if;
  update public.payments set status = 'refunded', provider_message = coalesce(p_note, provider_message) where id = pay.id;
  update public.promotion_orders set status = 'refunded' where id = pay.order_id returning listing_id into ord_listing;
  if ord_listing is not null then
    perform public.recompute_listing_promotions(ord_listing);
  end if;
  perform public.write_audit('payment_refunded', 'payments', pay.id::text, pg_catalog.jsonb_build_object('note', p_note));
  if pay.user_id is not null then
    perform public.notify_user(pay.user_id, 'payment_refunded', 'Ödəniş geri qaytarıldı',
      pg_catalog.format('%s ₼ məbləğində ödəniş geri qaytarıldı.', pay.amount), '/hesab/odenisler');
  end if;
  return 'refunded';
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation and administration (callers need staff permissions)
-- ---------------------------------------------------------------------------

create or replace function public.admin_moderate_listing(p_listing_id uuid, p_action text, p_reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.listings%rowtype;
  s jsonb := public.listing_settings();
  next_status text;
  msg_title text;
  msg_body text;
begin
  if not public.has_permission('listings.moderate') then
    raise exception 'forbidden';
  end if;
  select * into l from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if p_action in ('reject', 'remove') and char_length(pg_catalog.btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason_required';
  end if;

  case p_action
    when 'approve' then
      if l.status <> 'pending' then raise exception 'invalid_status'; end if;
      next_status := 'active';
      update public.listings
      set status = next_status,
          moderation_note = null,
          flags = array_remove(flags, 'reused_images'),
          published_at = coalesce(published_at, now()),
          expires_at = case
            when expires_at is null or expires_at <= now()
              then now() + pg_catalog.make_interval(days => (s ->> 'duration_days')::integer)
            else expires_at
          end
      where id = l.id;
      msg_title := 'Elanınız təsdiqləndi';
      msg_body := pg_catalog.format('"%s" elanı dərc olundu.', l.title);
    when 'reject' then
      if l.status not in ('pending', 'active', 'paused') then raise exception 'invalid_status'; end if;
      next_status := 'rejected';
      update public.listings set status = next_status, moderation_note = p_reason where id = l.id;
      msg_title := 'Elanınız rədd edildi';
      msg_body := pg_catalog.format('"%s": %s', l.title, p_reason);
    when 'remove' then
      next_status := 'removed';
      update public.listings set status = next_status, moderation_note = p_reason where id = l.id;
      msg_title := 'Elanınız silindi';
      msg_body := pg_catalog.format('"%s" qaydaları pozduğu üçün silindi: %s', l.title, p_reason);
    when 'restore' then
      if l.status not in ('removed', 'rejected') then raise exception 'invalid_status'; end if;
      next_status := 'pending';
      update public.listings set status = next_status, moderation_note = null where id = l.id;
      msg_title := 'Elanınız yenidən baxışa göndərildi';
      msg_body := pg_catalog.format('"%s" elanı yenidən moderasiyaya qaytarıldı.', l.title);
    else
      raise exception 'invalid_action';
  end case;

  insert into public.moderation_actions (listing_id, actor_id, action, reason)
  values (l.id, auth.uid(), p_action, p_reason);
  perform public.write_audit('listing_' || p_action, 'listings', l.id::text,
    pg_catalog.jsonb_build_object('from', l.status, 'to', next_status, 'reason', p_reason));
  perform public.notify_user(l.owner_id, 'moderation', msg_title, msg_body, '/hesab/elanlar');

  return next_status;
end;
$$;

create or replace function public.admin_resolve_report(
  p_report_id uuid, p_status text, p_note text default null, p_remove_listing boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rep public.listing_reports%rowtype;
begin
  if not public.has_permission('reports.manage') then
    raise exception 'forbidden';
  end if;
  if p_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception 'invalid_status';
  end if;
  select * into rep from public.listing_reports where id = p_report_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  update public.listing_reports
  set status = p_status,
      resolution_note = p_note,
      resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() end,
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
  where id = rep.id;

  if p_remove_listing then
    perform public.admin_moderate_listing(rep.listing_id, 'remove', coalesce(p_note, 'Şikayət əsasında silindi'));
    update public.listing_reports
    set status = 'resolved', resolved_by = auth.uid(), resolved_at = now(),
        resolution_note = coalesce(resolution_note, p_note)
    where listing_id = rep.listing_id and status in ('open', 'reviewing');
  end if;

  perform public.write_audit('report_' || p_status, 'listing_reports', rep.id::text,
    pg_catalog.jsonb_build_object('note', p_note, 'removed_listing', p_remove_listing));
end;
$$;

create or replace function public.admin_set_user_suspension(p_user_id uuid, p_suspended boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.suspend') then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'cannot_target_self';
  end if;
  if exists (select 1 from public.staff_roles where user_id = p_user_id)
     and not public.has_permission('staff.manage') then
    raise exception 'forbidden';
  end if;
  if p_suspended and char_length(pg_catalog.btrim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason_required';
  end if;

  update public.profiles set is_suspended = p_suspended where id = p_user_id;
  if not found then
    raise exception 'not_found';
  end if;
  update public.profile_private
  set suspended_reason = case when p_suspended then p_reason end,
      suspended_at = case when p_suspended then now() end
  where id = p_user_id;

  perform public.write_audit(case when p_suspended then 'user_suspended' else 'user_restored' end,
    'profiles', p_user_id::text, pg_catalog.jsonb_build_object('reason', p_reason));
  perform public.notify_user(p_user_id, 'account',
    case when p_suspended then 'Hesabınız dayandırıldı' else 'Hesabınız bərpa olundu' end,
    case when p_suspended then p_reason else 'Elanlarınız yenidən görünür.' end, '/hesab');
end;
$$;

create or replace function public.admin_set_user_verified(p_user_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('users.verify') then
    raise exception 'forbidden';
  end if;
  update public.profiles set is_verified = p_verified where id = p_user_id;
  if not found then
    raise exception 'not_found';
  end if;
  perform public.write_audit(case when p_verified then 'user_verified' else 'user_unverified' end,
    'profiles', p_user_id::text, '{}'::jsonb);
  if p_verified then
    perform public.notify_user(p_user_id, 'account', 'Satıcı profiliniz təsdiqləndi',
      'Profilinizdə artıq "Təsdiqlənmiş satıcı" nişanı görünür.', '/hesab/profil');
  end if;
end;
$$;

create or replace function public.admin_set_staff_role(p_user_id uuid, p_role text, p_grant boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('staff.manage') then
    raise exception 'forbidden';
  end if;
  if p_role not in ('super_admin', 'moderator', 'support') then
    raise exception 'invalid_role';
  end if;
  if p_grant then
    insert into public.staff_roles (user_id, role, granted_by)
    values (p_user_id, p_role, auth.uid())
    on conflict do nothing;
  else
    if p_role = 'super_admin'
       and (select count(*) from public.staff_roles where role = 'super_admin') <= 1
       and exists (select 1 from public.staff_roles where user_id = p_user_id and role = 'super_admin') then
      raise exception 'last_super_admin';
    end if;
    delete from public.staff_roles where user_id = p_user_id and role = p_role;
  end if;
end;
$$;

-- First administrator. Callable only with the service role / SQL editor, and only while no super-admin exists.
create or replace function public.bootstrap_super_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if exists (select 1 from public.staff_roles where role = 'super_admin') then
    raise exception 'super_admin_exists';
  end if;
  select id into target from auth.users where pg_catalog.lower(email) = pg_catalog.lower(p_email);
  if target is null then
    raise exception 'user_not_found';
  end if;
  insert into public.staff_roles (user_id, role) values (target, 'super_admin');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, details)
  values (null, 'bootstrap_super_admin', 'staff_roles', target::text, pg_catalog.jsonb_build_object('email', p_email));
  return target;
end;
$$;

create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.has_permission('dashboard.view') then
    raise exception 'forbidden';
  end if;

  select pg_catalog.jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'users_new_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_suspended', (select count(*) from public.profiles where is_suspended),
    'listings_active', (select count(*) from public.listings where status = 'active' and expires_at > now()),
    'listings_pending', (select count(*) from public.listings where status = 'pending'),
    'listings_sold', (select count(*) from public.listings where status = 'sold'),
    'listings_new_7d', (select count(*) from public.listings where created_at > now() - interval '7 days' and status <> 'draft'),
    'reports_open', (select count(*) from public.listing_reports where status in ('open', 'reviewing')),
    'support_open', (select count(*) from public.support_requests where status <> 'closed'),
    'promotions_active', (select count(*) from public.promotion_orders where status = 'active'),
    'revenue_total', (select coalesce(sum(amount), 0) from public.payments where status = 'succeeded' and provider = 'epoint'),
    'revenue_30d', (select coalesce(sum(amount), 0) from public.payments
      where status = 'succeeded' and provider = 'epoint' and confirmed_at > now() - interval '30 days'),
    'payments_by_status', (
      select coalesce(pg_catalog.jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status, count(*) as n from public.payments group by status) x
    ),
    'daily', (
      select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'day', d::date,
        'users', (select count(*) from public.profiles where created_at::date = d::date),
        'listings', (select count(*) from public.listings where created_at::date = d::date and status <> 'draft')
      ) order by d), '[]'::jsonb)
      from pg_catalog.generate_series(current_date - 29, current_date, interval '1 day') d
    )
  ) into result;

  return result;
end;
$$;

-- GDPR-style export of everything we hold about the calling user.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  return pg_catalog.jsonb_build_object(
    'exported_at', now(),
    'profile', (select pg_catalog.to_jsonb(p) from public.profiles p where id = uid),
    'private', (select pg_catalog.to_jsonb(pp) from public.profile_private pp where id = uid),
    'listings', (select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(l) - 'search_vector' - 'search_extra'), '[]') from public.listings l where owner_id = uid),
    'listing_contacts', (select coalesce(pg_catalog.jsonb_agg(c), '[]') from public.listing_contacts c where owner_id = uid),
    'listing_images', (select coalesce(pg_catalog.jsonb_agg(i), '[]') from public.listing_images i where owner_id = uid),
    'favorites', (select coalesce(pg_catalog.jsonb_agg(f), '[]') from public.favorites f where user_id = uid),
    'promotion_orders', (select coalesce(pg_catalog.jsonb_agg(o), '[]') from public.promotion_orders o where user_id = uid),
    'payments', (select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(pm)), '[]') from public.payments pm where user_id = uid),
    'reports_submitted', (select coalesce(pg_catalog.jsonb_agg(r), '[]') from public.listing_reports r where reporter_id = uid),
    'notifications', (select coalesce(pg_catalog.jsonb_agg(n), '[]') from public.notifications n where user_id = uid),
    'support_requests', (select coalesce(pg_catalog.jsonb_agg(s), '[]') from public.support_requests s where user_id = uid)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Search (caller rights; public results only)
-- ---------------------------------------------------------------------------

create or replace function public.search_listings(
  p_query text default null,
  p_category_id bigint default null,
  p_make_id bigint default null,
  p_model_id bigint default null,
  p_year integer default null,
  p_oem text default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_conditions text[] default null,
  p_city_slugs text[] default null,
  p_region text default null,
  p_seller_type text default null,
  p_delivery boolean default null,
  p_verified boolean default null,
  p_promoted boolean default null,
  p_seller_id uuid default null,
  p_sort text default 'relevance',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid, ref_no bigint, slug text, title text, price numeric, is_negotiable boolean, condition text,
  category_name text, city_name text, make_name text, model_name text, year_from smallint, year_to smallint,
  oem_code text, delivery_available boolean, view_count integer, published_at timestamptz,
  is_top boolean, is_vip boolean, is_premium boolean, is_highlighted boolean,
  seller_name text, seller_type text, seller_verified boolean, cover_thumb_path text,
  rank real, total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_catalog
as $$
#variable_conflict use_column
declare
  folded text := nullif(btrim(regexp_replace(az_fold(coalesce(p_query, '')), '[^a-z0-9]+', ' ', 'g')), '');
  tsq tsquery;
  oem_norm text := nullif(upper(regexp_replace(coalesce(p_oem, ''), '[^A-Za-z0-9]', '', 'g')), '');
  query_oem text := nullif(upper(regexp_replace(coalesce(p_query, ''), '[^A-Za-z0-9]', '', 'g')), '');
  lim integer := least(greatest(coalesce(p_limit, 24), 1), 60);
  off integer := least(greatest(coalesce(p_offset, 0), 0), 10000);
begin
  if folded is not null then
    select to_tsquery('simple', string_agg(quote_literal(tok) || ':*', ' & '))
      into tsq
      from regexp_split_to_table(folded, '\s+') tok
      where tok <> '';
  end if;

  return query
  with matched as (
    select
      c.*,
      case
        when folded is null then 0::real
        else (ts_rank(l.search_vector, tsq) + similarity(az_fold(l.title), folded) * 0.5
              + case when query_oem is not null and l.oem_normalized = query_oem then 2 else 0 end)::real
      end as score
    from listing_cards c
    join listings l on l.id = c.id
    where c.is_public
      and (folded is null
           or l.search_vector @@ tsq
           or az_fold(l.title) % folded
           or (query_oem is not null and char_length(query_oem) >= 4 and l.oem_normalized = query_oem))
      and (p_category_id is null
           or c.category_id = p_category_id
           or c.category_id in (select cat.id from categories cat where cat.parent_id = p_category_id))
      and (p_make_id is null or c.make_id = p_make_id)
      and (p_model_id is null or c.model_id = p_model_id)
      and (p_year is null or ((c.year_from is null or c.year_from <= p_year) and (c.year_to is null or c.year_to >= p_year)
                              and (c.year_from is not null or c.year_to is not null)))
      and (oem_norm is null or l.oem_normalized like oem_norm || '%')
      and (p_price_min is null or c.price >= p_price_min)
      and (p_price_max is null or c.price <= p_price_max)
      and (p_conditions is null or cardinality(p_conditions) = 0 or c.condition = any (p_conditions))
      and (p_city_slugs is null or cardinality(p_city_slugs) = 0 or c.city_slug = any (p_city_slugs))
      and (p_region is null or c.city_slug in (select ct.slug from cities ct where ct.region = p_region))
      and (p_seller_type is null or c.seller_type = p_seller_type)
      and (p_delivery is null or not p_delivery or c.delivery_available)
      and (p_verified is null or not p_verified or c.seller_verified)
      and (p_promoted is null or not p_promoted or c.is_top or c.is_vip or c.is_premium)
      and (p_seller_id is null or c.owner_id = p_seller_id)
  )
  select
    m.id, m.ref_no, m.slug, m.title, m.price, m.is_negotiable, m.condition,
    m.category_name, m.city_name, m.make_name, m.model_name, m.year_from, m.year_to,
    m.oem_code, m.delivery_available, m.view_count, m.published_at,
    m.is_top, m.is_vip, m.is_premium, m.is_highlighted,
    m.seller_name, m.seller_type, m.seller_verified, m.cover_thumb_path,
    m.score, count(*) over ()
  from matched m
  order by
    case when p_sort in ('relevance', 'newest') then m.is_top else false end desc,
    case when p_sort = 'relevance' then m.score end desc nulls last,
    case when p_sort = 'price_asc' then m.price end asc nulls last,
    case when p_sort = 'price_desc' then m.price end desc nulls last,
    case when p_sort = 'views' then m.view_count end desc nulls last,
    m.published_at desc,
    m.id
  limit lim offset off;
end;
$$;
