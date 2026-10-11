-- Partivo.az — row level security, explicit grants and function privileges.
-- Principle: revoke Supabase's broad default grants, then grant exactly what each role needs.
-- System-managed columns (status, promotions, counters, trust flags) are never client-writable;
-- they change only through the SECURITY DEFINER functions in the previous migration.

create or replace function public.is_user_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_suspended from public.profiles where id = p_user_id), false)
$$;

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.cities, public.categories, public.vehicle_makes, public.vehicle_models to anon, authenticated;
grant insert, update, delete on public.cities, public.categories, public.vehicle_makes, public.vehicle_models to authenticated;

grant select on public.role_permissions to authenticated;
grant select on public.staff_roles to authenticated;

grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;
grant select on public.content_pages to anon, authenticated;
grant insert, update on public.content_pages to authenticated;
grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

grant select on public.profiles to anon, authenticated;
grant update (display_name, seller_type, business_name, business_description, business_address, avatar_path, city_slug)
  on public.profiles to authenticated;
grant select on public.profile_private to authenticated;
grant update (phone, default_contact_method, email_notifications) on public.profile_private to authenticated;

grant select on public.listings to anon, authenticated;
grant insert (
  owner_id, title, description, price, is_negotiable, category_id, condition, city_slug,
  make_id, model_id, year_from, year_to, engine_type, engine_volume, oem_code, manufacturer, originality,
  compatibility_notes, delivery_available, pickup_available, delivery_notes, warranty_months, warranty_notes, contact_method
) on public.listings to authenticated;
grant update (
  title, description, price, is_negotiable, category_id, condition, city_slug,
  make_id, model_id, year_from, year_to, engine_type, engine_volume, oem_code, manufacturer, originality,
  compatibility_notes, delivery_available, pickup_available, delivery_notes, warranty_months, warranty_notes, contact_method
) on public.listings to authenticated;
grant delete on public.listings to authenticated;
grant select on public.listing_cards to anon, authenticated;

grant select, delete on public.listing_contacts to authenticated;
grant insert (listing_id, owner_id, phone) on public.listing_contacts to authenticated;
grant update (phone) on public.listing_contacts to authenticated;

grant select on public.listing_images to anon, authenticated;
grant insert (listing_id, owner_id, storage_path, thumb_path, width, height, size_bytes, content_hash, position)
  on public.listing_images to authenticated;
grant update (position) on public.listing_images to authenticated;
grant delete on public.listing_images to authenticated;

grant select, delete on public.favorites to authenticated;
grant insert (user_id, listing_id) on public.favorites to authenticated;

grant select on public.listing_reports to authenticated;
grant insert (listing_id, reporter_id, reason, details) on public.listing_reports to authenticated;

grant select on public.moderation_actions to authenticated;

grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

grant select on public.promotion_packages to anon, authenticated;
grant insert, update, delete on public.promotion_packages to authenticated;
grant select on public.promotion_orders, public.payments, public.payment_events to authenticated;

grant select on public.support_requests to authenticated;
grant update (status, staff_note, assigned_to) on public.support_requests to authenticated;

grant select on public.audit_logs to authenticated;
-- rate_limits and listing_views: no client access at all.

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.cities enable row level security;
alter table public.categories enable row level security;
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_roles enable row level security;
alter table public.app_settings enable row level security;
alter table public.content_pages enable row level security;
alter table public.announcements enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.listings enable row level security;
alter table public.listing_contacts enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites enable row level security;
alter table public.listing_views enable row level security;
alter table public.listing_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.notifications enable row level security;
alter table public.promotion_packages enable row level security;
alter table public.promotion_orders enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.support_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

-- Catalog -------------------------------------------------------------------
create policy cities_read on public.cities for select to anon, authenticated
  using (is_active or public.has_permission('catalog.manage'));
create policy cities_write on public.cities for all to authenticated
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or public.has_permission('catalog.manage'));
create policy categories_write on public.categories for all to authenticated
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

create policy makes_read on public.vehicle_makes for select to anon, authenticated
  using (is_active or public.has_permission('catalog.manage'));
create policy makes_write on public.vehicle_makes for all to authenticated
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

create policy models_read on public.vehicle_models for select to anon, authenticated
  using (is_active or public.has_permission('catalog.manage'));
create policy models_write on public.vehicle_models for all to authenticated
  using (public.has_permission('catalog.manage')) with check (public.has_permission('catalog.manage'));

-- Staff ---------------------------------------------------------------------
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
create policy staff_roles_read on public.staff_roles for select to authenticated
  using (user_id = auth.uid() or public.has_permission('staff.manage'));

-- Settings & content --------------------------------------------------------
create policy settings_read on public.app_settings for select to anon, authenticated
  using (is_public or public.has_permission('settings.manage'));
create policy settings_insert on public.app_settings for insert to authenticated
  with check (public.has_permission('settings.manage'));
create policy settings_update on public.app_settings for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy content_read on public.content_pages for select to anon, authenticated
  using (is_published or public.has_permission('content.manage'));
create policy content_insert on public.content_pages for insert to authenticated
  with check (public.has_permission('content.manage'));
create policy content_update on public.content_pages for update to authenticated
  using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));

create policy announcements_read on public.announcements for select to anon, authenticated
  using (
    (is_active and starts_at <= now() and (ends_at is null or ends_at > now()))
    or public.has_permission('content.manage')
  );
create policy announcements_write on public.announcements for all to authenticated
  using (public.has_permission('content.manage')) with check (public.has_permission('content.manage'));

-- Profiles ------------------------------------------------------------------
create policy profiles_read on public.profiles for select to anon, authenticated
  using (not is_suspended or id = auth.uid() or public.has_permission('users.view'));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profile_private_read on public.profile_private for select to authenticated
  using (id = auth.uid() or public.has_permission('users.view'));
create policy profile_private_update_own on public.profile_private for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Listings ------------------------------------------------------------------
-- Public: only active, unexpired listings of non-suspended sellers. Owners see their own; staff see all.
create policy listings_read on public.listings for select to anon, authenticated
  using (
    (status = 'active' and expires_at > now() and not public.is_user_suspended(owner_id))
    or owner_id = auth.uid()
    or public.has_permission('listings.view_all')
  );
create policy listings_insert_own on public.listings for insert to authenticated
  with check (owner_id = auth.uid() and status = 'draft' and not public.is_user_suspended(auth.uid()));
create policy listings_update_own on public.listings for update to authenticated
  using (owner_id = auth.uid() and status <> 'removed' and not public.is_user_suspended(auth.uid()))
  with check (owner_id = auth.uid());
create policy listings_delete_own on public.listings for delete to authenticated
  using (owner_id = auth.uid());

create policy contacts_read on public.listing_contacts for select to authenticated
  using (owner_id = auth.uid() or public.has_permission('listings.view_all'));
create policy contacts_insert_own on public.listing_contacts for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );
create policy contacts_update_own on public.listing_contacts for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy contacts_delete_own on public.listing_contacts for delete to authenticated
  using (owner_id = auth.uid());

-- Images are visible exactly when their listing is visible to the caller.
create policy images_read on public.listing_images for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy images_insert_own on public.listing_images for insert to authenticated
  with check (
    owner_id = auth.uid()
    and storage_path like auth.uid()::text || '/%'
    and thumb_path like auth.uid()::text || '/%'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid() and l.status <> 'removed'
    )
  );
create policy images_update_own on public.listing_images for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy images_delete_own on public.listing_images for delete to authenticated
  using (owner_id = auth.uid());

create policy favorites_read_own on public.favorites for select to authenticated
  using (user_id = auth.uid());
create policy favorites_insert_own on public.favorites for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.listings l where l.id = listing_id));
create policy favorites_delete_own on public.favorites for delete to authenticated
  using (user_id = auth.uid());

create policy reports_insert_own on public.listing_reports for insert to authenticated
  with check (reporter_id = auth.uid() and exists (select 1 from public.listings l where l.id = listing_id));
create policy reports_read on public.listing_reports for select to authenticated
  using (reporter_id = auth.uid() or public.has_permission('reports.view') or public.has_permission('reports.manage'));

create policy moderation_read on public.moderation_actions for select to authenticated
  using (public.has_permission('listings.view_all'));

create policy notifications_read_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Promotions & payments -----------------------------------------------------
create policy packages_read on public.promotion_packages for select to anon, authenticated
  using (is_active or public.has_permission('packages.manage'));
create policy packages_write on public.promotion_packages for all to authenticated
  using (public.has_permission('packages.manage')) with check (public.has_permission('packages.manage'));

create policy orders_read on public.promotion_orders for select to authenticated
  using (user_id = auth.uid() or public.has_permission('payments.view'));
create policy payments_read on public.payments for select to authenticated
  using (user_id = auth.uid() or public.has_permission('payments.view'));
create policy payment_events_read on public.payment_events for select to authenticated
  using (public.has_permission('payments.view'));

-- Support & audit -----------------------------------------------------------
create policy support_read on public.support_requests for select to authenticated
  using (user_id = auth.uid() or public.has_permission('support.manage'));
create policy support_update on public.support_requests for update to authenticated
  using (public.has_permission('support.manage')) with check (public.has_permission('support.manage'));

create policy audit_read on public.audit_logs for select to authenticated
  using (public.has_permission('audit.view'));

-- ---------------------------------------------------------------------------
-- Function privileges (Postgres grants EXECUTE to PUBLIC by default)
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.az_fold(text),
  public.slugify(text),
  public.has_permission(text),
  public.is_staff(),
  public.is_user_suspended(uuid),
  public.get_setting(text),
  public.listing_settings(),
  public.search_listings(text, bigint, bigint, bigint, integer, text, numeric, numeric, text[], text[], text, text, boolean, boolean, boolean, uuid, text, integer, integer)
to anon, authenticated;

grant execute on function
  public.my_permissions(),
  public.publish_listing(uuid),
  public.change_listing_status(uuid, text),
  public.reorder_listing_images(uuid, uuid[]),
  public.export_my_data(),
  public.admin_moderate_listing(uuid, text, text),
  public.admin_resolve_report(uuid, text, text, boolean),
  public.admin_set_user_suspension(uuid, boolean, text),
  public.admin_set_user_verified(uuid, boolean),
  public.admin_set_staff_role(uuid, text, boolean),
  public.admin_dashboard_stats()
to authenticated;

-- Server-only operations (called with the service role key from trusted server code).
grant execute on function
  public.rate_limit_hit(text, integer, integer),
  public.record_listing_view(uuid, text),
  public.run_maintenance(),
  public.create_promotion_order(uuid, uuid, bigint, text),
  public.attach_provider_transaction(uuid, text),
  public.confirm_payment(uuid, text, numeric, text, text, text, text, text, text),
  public.fail_payment(uuid, text, text, text),
  public.refund_payment(uuid, text),
  public.bootstrap_super_admin(text),
  public.notify_user(uuid, text, text, text, text),
  public.write_audit(text, text, text, jsonb),
  public.recompute_listing_promotions(uuid)
to service_role;
