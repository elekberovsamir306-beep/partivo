/**
 * Runs against the real migrations in PGlite. Covers row-level security, column grants,
 * listing lifecycle, moderation, search, payments/promotions and admin permissions.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Transaction } from '@electric-sql/pglite'
import { createTestDb, type TestDb } from './harness'

let db: TestDb
let seller: string
let buyer: string
let moderator: string
let support: string
let categoryId: number

const q = async <T = Record<string, unknown>>(tx: Transaction, sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows

async function createDraft(owner: string, title = 'Toyota Camry ön sükan rıçaqı') {
  return db.as('authenticated', owner, async (tx) => {
    const [row] = await q<{ id: string }>(
      tx,
      `insert into public.listings (owner_id, title, description, price, category_id, condition, city_slug, oem_code)
       values ($1, $2, 'Original hissə, yaxşı vəziyyətdə, heç bir zədəsi yoxdur.', 120, $3, 'used', 'baki', '48068-33050')
       returning id`,
      [owner, title, categoryId],
    )
    await q(tx, `insert into public.listing_contacts (listing_id, owner_id, phone) values ($1, $2, '+994501234567')`, [row.id, owner])
    return row.id
  })
}

async function addImages(owner: string, listingId: string, count: number, hashPrefix = listingId) {
  await db.as('authenticated', owner, async (tx) => {
    for (let i = 0; i < count; i++) {
      await q(
        tx,
        `insert into public.listing_images (listing_id, owner_id, storage_path, thumb_path, width, height, size_bytes, content_hash, position)
         values ($1, $2, $3, $4, 1600, 1200, 120000, $5, $6)`,
        [listingId, owner, `${owner}/${listingId}/${hashPrefix.slice(-6)}-${i}.webp`, `${owner}/${listingId}/${hashPrefix.slice(-6)}-${i}-t.webp`, `${hashPrefix}-${i}`, i],
      )
    }
  })
}

const publish = (owner: string, id: string) =>
  db.as('authenticated', owner, async (tx) => (await q<{ s: string }>(tx, 'select public.publish_listing($1) as s', [id]))[0].s)

const moderate = (actor: string, id: string, action: string, reason: string | null = null) =>
  db.as('authenticated', actor, async (tx) => (await q<{ s: string }>(tx, 'select public.admin_moderate_listing($1, $2, $3) as s', [id, action, reason]))[0].s)

async function activeListing(owner: string, title?: string) {
  const id = await createDraft(owner, title)
  await addImages(owner, id, 5)
  await publish(owner, id)
  await moderate(moderator, id, 'approve')
  return id
}

beforeAll(async () => {
  db = await createTestDb()
  seller = await db.createUser({ email: 'seller@example.test', displayName: 'Satıcı Elvin' })
  buyer = await db.createUser({ email: 'buyer@example.test', displayName: 'Alıcı Aysel' })
  moderator = await db.createUser({ email: 'mod@example.test', displayName: 'Moderator' })
  support = await db.createUser({ email: 'support@example.test', displayName: 'Dəstək' })
  await db.pg.query(`insert into public.staff_roles (user_id, role) values ($1, 'moderator'), ($2, 'support')`, [moderator, support])
  const { rows } = await db.pg.query<{ id: number }>(`select id from public.categories where slug = 'ricaqlar-ve-sarovoylar'`)
  categoryId = rows[0].id
})

afterAll(async () => {
  await db?.close()
})

describe('accounts', () => {
  it('creates profiles from auth sign-up metadata', async () => {
    const { rows } = await db.pg.query<{ display_name: string; email: string }>(
      `select p.display_name, pp.email from public.profiles p join public.profile_private pp using (id) where p.id = $1`,
      [seller],
    )
    expect(rows[0]).toEqual({ display_name: 'Satıcı Elvin', email: 'seller@example.test' })
  })

  it('keeps private profile data private', async () => {
    const other = await db.as('authenticated', buyer, (tx) => q(tx, 'select * from public.profile_private where id = $1', [seller]))
    const anon = await db.as('anon', null, (tx) => q(tx, 'select email from public.profile_private').catch((e: Error) => e.message))
    expect(other).toHaveLength(0)
    expect(String(anon)).toMatch(/permission denied/)
  })

  it('prevents users from granting themselves trust flags or staff roles', async () => {
    await expect(db.as('authenticated', seller, (tx) => q(tx, 'update public.profiles set is_verified = true where id = $1', [seller]))).rejects.toThrow(/permission denied/)
    await expect(db.as('authenticated', seller, (tx) => q(tx, `insert into public.staff_roles (user_id, role) values ($1, 'super_admin')`, [seller]))).rejects.toThrow(/permission denied/)
    await expect(db.as('authenticated', seller, (tx) => q(tx, `select public.bootstrap_super_admin('seller@example.test')`))).rejects.toThrow(/permission denied/)
  })
})

describe('listing visibility and ownership', () => {
  it('hides drafts from the public and other users but not from the owner', async () => {
    const id = await createDraft(seller)
    const anon = await db.as('anon', null, (tx) => q(tx, 'select id from public.listings where id = $1', [id]))
    const other = await db.as('authenticated', buyer, (tx) => q(tx, 'select id from public.listings where id = $1', [id]))
    const owner = await db.as('authenticated', seller, (tx) => q(tx, 'select id from public.listings where id = $1', [id]))
    expect(anon).toHaveLength(0)
    expect(other).toHaveLength(0)
    expect(owner).toHaveLength(1)
  })

  it('never exposes contact phones publicly', async () => {
    const id = await activeListing(seller, 'Ön amortizator Toyota Camry')
    const anon = await db.as('anon', null, (tx) => q(tx, 'select phone from public.listing_contacts').catch((e: Error) => e.message))
    const other = await db.as('authenticated', buyer, (tx) => q(tx, 'select phone from public.listing_contacts where listing_id = $1', [id]))
    expect(String(anon)).toMatch(/permission denied/)
    expect(other).toHaveLength(0)
  })

  it('lets owners update their contact phone, but never re-assign the row (why the app avoids upsert)', async () => {
    const id = await createDraft(seller, 'Kontakt yeniləmə testi')
    const updated = await db.as('authenticated', seller, (tx) =>
      q(tx, `update public.listing_contacts set phone = '+994551112233' where listing_id = $1 returning phone`, [id]),
    )
    expect(updated).toEqual([{ phone: '+994551112233' }])
    // PostgREST upsert = INSERT ... ON CONFLICT DO UPDATE SET listing_id, owner_id, phone → must be refused.
    await expect(
      db.as('authenticated', seller, (tx) =>
        q(
          tx,
          `insert into public.listing_contacts (listing_id, owner_id, phone) values ($1, $2, '+994551112233')
           on conflict (listing_id) do update set listing_id = excluded.listing_id, owner_id = excluded.owner_id, phone = excluded.phone`,
          [id, seller],
        ),
      ),
    ).rejects.toThrow(/permission denied/)
  })

  it('blocks owners from changing system columns and other users from editing', async () => {
    const id = await createDraft(seller, 'Arxa stop sol tərəf')
    await expect(db.as('authenticated', seller, (tx) => q(tx, `update public.listings set status = 'active' where id = $1`, [id]))).rejects.toThrow(/permission denied/)
    await expect(db.as('authenticated', seller, (tx) => q(tx, `update public.listings set view_count = 9999 where id = $1`, [id]))).rejects.toThrow(/permission denied/)
    const changed = await db.as('authenticated', buyer, (tx) => q(tx, `update public.listings set title = 'hacked' where id = $1 returning id`, [id]))
    expect(changed).toHaveLength(0)
    await expect(db.as('authenticated', buyer, (tx) => q(tx, `insert into public.listings (owner_id, title) values ($1, 'x')`, [seller]))).rejects.toThrow(/row-level security/)
  })

  it('prevents attaching images to another user’s listing or storage folder', async () => {
    const id = await createDraft(seller, 'Kapot Hyundai Elantra')
    await expect(addImages(buyer, id, 1)).rejects.toThrow(/row-level security/)
    await expect(
      db.as('authenticated', buyer, (tx) => q(tx, `insert into storage.objects (bucket_id, name) values ('listing-images', $1)`, [`${seller}/${id}/evil.webp`])),
    ).rejects.toThrow(/row-level security/)
    const ok = await db.as('authenticated', seller, (tx) =>
      q(tx, `insert into storage.objects (bucket_id, name) values ('listing-images', $1) returning id`, [`${seller}/${id}/ok.webp`]),
    )
    expect(ok).toHaveLength(1)
  })
})

describe('publishing and moderation', () => {
  it('requires the configured number of photos', async () => {
    const id = await createDraft(seller, 'Radiator Kia Rio 2017')
    await addImages(seller, id, 4)
    await expect(publish(seller, id)).rejects.toThrow(/not_enough_photos/)
    await addImages(seller, id, 1, `${id}-extra`)
    expect(await publish(seller, id)).toBe('pending')
  })

  it('lets only moderators approve, and notifies the seller', async () => {
    const id = await createDraft(seller, 'Generator Mercedes E-Class W212')
    await addImages(seller, id, 5)
    await publish(seller, id)
    await expect(moderate(support, id, 'approve')).rejects.toThrow(/forbidden/)
    await expect(moderate(seller, id, 'approve')).rejects.toThrow(/forbidden/)
    expect(await moderate(moderator, id, 'approve')).toBe('active')
    const visible = await db.as('anon', null, (tx) => q<{ expires_at: string }>(tx, 'select expires_at from public.listings where id = $1', [id]))
    expect(visible).toHaveLength(1)
    const notes = await db.as('authenticated', seller, (tx) => q(tx, `select title from public.notifications where type = 'moderation'`))
    expect(notes.length).toBeGreaterThan(0)
  })

  it('requires a reason to reject', async () => {
    const id = await createDraft(seller, 'Starter BMW X5 E70')
    await addImages(seller, id, 5)
    await publish(seller, id)
    await expect(moderate(moderator, id, 'reject', '')).rejects.toThrow(/reason_required/)
    expect(await moderate(moderator, id, 'reject', 'Şəkillər məhsula uyğun deyil')).toBe('rejected')
  })

  it('detects duplicates and reused photos', async () => {
    const title = 'Duman farası Lexus RX 350'
    await activeListing(seller, title)
    const dup = await createDraft(seller, `  ${title.toUpperCase()} `)
    await addImages(seller, dup, 5)
    await expect(publish(seller, dup)).rejects.toThrow(/duplicate_listing/)

    // Buyer re-uses the seller's photos (same content hash): forced into manual review and flagged.
    const thief = await createDraft(buyer, 'Lexus RX duman farası')
    const [{ listing_id }] = (await db.pg.query<{ listing_id: string }>(`select listing_id from public.listing_images where owner_id = $1 limit 1`, [seller])).rows
    await addImages(buyer, thief, 5, listing_id)
    expect(await publish(buyer, thief)).toBe('pending')
    const { rows } = await db.pg.query<{ flags: string[] }>('select flags from public.listings where id = $1', [thief])
    expect(rows[0].flags).toContain('reused_images')
  })

  it('hides listings of suspended sellers and blocks their writes', async () => {
    const bad = await db.createUser({ email: 'bad@example.test', displayName: 'Şübhəli' })
    const id = await activeListing(bad, 'Mühərrik yastığı Opel Astra')
    await db.as('authenticated', moderator, (tx) => q(tx, `select public.admin_set_user_suspension($1, true, 'Fırıldaqçılıq şübhəsi')`, [bad]))
    const anon = await db.as('anon', null, (tx) => q(tx, 'select id from public.listings where id = $1', [id]))
    expect(anon).toHaveLength(0)
    await expect(createDraft(bad, 'Yeni elan')).rejects.toThrow(/row-level security/)
  })

  it('supports the owner lifecycle: pause, resume, sold', async () => {
    const id = await activeListing(seller, 'Sürətlər qutusu Toyota Prius')
    const act = (a: string) => db.as('authenticated', seller, async (tx) => (await q<{ s: string }>(tx, 'select public.change_listing_status($1, $2) as s', [id, a]))[0].s)
    expect(await act('pause')).toBe('paused')
    expect(await act('resume')).toBe('active')
    await expect(act('renew')).rejects.toThrow(/renewal_not_available/)
    expect(await act('mark_sold')).toBe('sold')
    await expect(db.as('authenticated', buyer, (tx) => q(tx, `select public.change_listing_status($1, 'pause')`, [id]))).rejects.toThrow(/not_found/)
  })
})

describe('search', () => {
  it('matches folded Azerbaijani text, OEM codes and excludes non-public listings', async () => {
    const id = await activeListing(seller, 'Sükan rıçaqı Toyota RAV4')
    const draft = await createDraft(seller, 'Sükan rıçaqı qaralama')
    const run = (query: string) =>
      db.as('anon', null, (tx) => q<{ id: string; total_count: number }>(tx, `select id, total_count from public.search_listings(p_query => $1)`, [query]))
    const ascii = (await run('sukan ricaqi')).map((r) => r.id)
    expect(ascii).toContain(id)
    expect(ascii).not.toContain(draft)
    expect((await run('48068 33050')).map((r) => r.id)).toContain(id)
    const filtered = await db.as('anon', null, (tx) =>
      q<{ id: string }>(tx, `select id from public.search_listings(p_query => 'sukan', p_price_min => 500)`),
    )
    expect(filtered).toHaveLength(0)
  })
})

describe('favorites', () => {
  it('are private to each user and update the counter', async () => {
    const id = await activeListing(seller, 'Əyləc diskləri Hyundai Tucson')
    await db.as('authenticated', buyer, (tx) => q(tx, 'insert into public.favorites (user_id, listing_id) values ($1, $2)', [buyer, id]))
    await expect(db.as('authenticated', buyer, (tx) => q(tx, 'insert into public.favorites (user_id, listing_id) values ($1, $2)', [seller, id]))).rejects.toThrow(/row-level security/)
    const seen = await db.as('authenticated', seller, (tx) => q(tx, 'select * from public.favorites where listing_id = $1', [id]))
    expect(seen).toHaveLength(0)
    const { rows } = await db.pg.query<{ favorite_count: number }>('select favorite_count from public.listings where id = $1', [id])
    expect(rows[0].favorite_count).toBe(1)
  })
})

describe('promotions and payments', () => {
  async function order(listingId: string, code = 'vip') {
    const [{ id: pkg }] = (await db.pg.query<{ id: number }>(`select id from public.promotion_packages where code = $1`, [code])).rows
    return db.as('service_role', null, async (tx) =>
      (await q<{ order_id: string; payment_id: string; amount: string }>(tx, `select * from public.create_promotion_order($1, $2, $3, 'epoint')`, [seller, listingId, pkg]))[0],
    )
  }
  const confirm = (paymentId: string, amount: number) =>
    db.as('service_role', null, async (tx) =>
      (await q<{ r: string }>(tx, `select public.confirm_payment($1, $2, $3, 'AZN', 'success', '000') as r`, [paymentId, `te_${paymentId}`, amount]))[0].r,
    )

  it('cannot be created or confirmed by end users', async () => {
    const id = await activeListing(seller, 'Kondisioner kompressoru Kia Sportage')
    await expect(db.as('authenticated', seller, (tx) => q(tx, `select * from public.create_promotion_order($1, $2, 1, 'epoint')`, [seller, id]))).rejects.toThrow(/permission denied/)
    const { payment_id } = await order(id)
    await expect(db.as('authenticated', seller, (tx) => q(tx, `select public.confirm_payment($1, 'x', 7, 'AZN', 'success')`, [payment_id]))).rejects.toThrow(/permission denied/)
    await expect(db.as('authenticated', seller, (tx) => q(tx, `update public.payments set status = 'succeeded' where id = $1`, [payment_id]))).rejects.toThrow(/permission denied/)
  })

  it('uses the database price and activates exactly once', async () => {
    const id = await activeListing(seller, 'VIP test elanı ön bamper')
    const { payment_id, amount } = await order(id)
    expect(Number(amount)).toBe(7)
    expect(await confirm(payment_id, 7)).toBe('activated')
    expect(await confirm(payment_id, 7)).toBe('already_processed')
    const { rows } = await db.pg.query<{ vip: boolean; top: boolean }>(
      `select promo_vip_until > now() as vip, promo_top_until > now() as top from public.listings where id = $1`,
      [id],
    )
    expect(rows[0]).toEqual({ vip: true, top: true })
    const { rows: orders } = await db.pg.query<{ c: number }>(`select count(*)::int as c from public.promotion_orders where listing_id = $1 and status = 'active'`, [id])
    expect(orders[0].c).toBe(1)
  })

  it('refuses to activate when the paid amount does not match', async () => {
    const id = await activeListing(seller, 'Mismatch test arxa güzgü')
    const { payment_id } = await order(id)
    expect(await confirm(payment_id, 0.01)).toBe('amount_mismatch')
    const { rows } = await db.pg.query<{ promo_vip_until: string | null }>('select promo_vip_until from public.listings where id = $1', [id])
    expect(rows[0].promo_vip_until).toBeNull()
  })

  it('expires promotions and listings in maintenance', async () => {
    const id = await activeListing(seller, 'Expiry test yanacaq nasosu')
    const { payment_id } = await order(id, 'top')
    await confirm(payment_id, 3)
    await db.pg.query(`update public.promotion_orders set ends_at = now() - interval '1 minute' where listing_id = $1`, [id])
    await db.pg.query(`update public.listings set expires_at = now() - interval '1 minute' where id = $1`, [id])
    const [{ r }] = (await db.pg.query<{ r: { expired_listings: number; expired_orders: number } }>(`select public.run_maintenance() as r`)).rows
    expect(r.expired_listings).toBeGreaterThanOrEqual(1)
    expect(r.expired_orders).toBeGreaterThanOrEqual(1)
    const { rows } = await db.pg.query<{ status: string; promo_top_until: string | null }>('select status, promo_top_until from public.listings where id = $1', [id])
    expect(rows[0]).toEqual({ status: 'expired', promo_top_until: null })
  })

  it('keeps payment records private to the buyer and finance staff', async () => {
    const other = await db.as('authenticated', buyer, (tx) => q(tx, 'select id from public.payments'))
    const staff = await db.as('authenticated', support, (tx) => q(tx, 'select id from public.payments'))
    expect(other).toHaveLength(0)
    expect(staff.length).toBeGreaterThan(0)
  })
})

describe('admin permissions', () => {
  it('restricts the dashboard, audit log and settings to the right roles', async () => {
    await expect(db.as('authenticated', buyer, (tx) => q(tx, 'select public.admin_dashboard_stats()'))).rejects.toThrow(/forbidden/)
    const stats = await db.as('authenticated', support, (tx) => q<{ s: { users_total: number } }>(tx, 'select public.admin_dashboard_stats() as s'))
    expect(stats[0].s.users_total).toBeGreaterThan(0)
    const audit = await db.as('authenticated', moderator, (tx) => q(tx, 'select id from public.audit_logs'))
    expect(audit).toHaveLength(0) // moderators lack audit.view
    const changed = await db.as('authenticated', moderator, (tx) => q(tx, `update public.app_settings set value = '{}' where key = 'listings' returning key`))
    expect(changed).toHaveLength(0)
  })

  it('audits privileged actions', async () => {
    const { rows } = await db.pg.query<{ c: number }>(`select count(*)::int as c from public.audit_logs where action like 'listing_%'`)
    expect(rows[0].c).toBeGreaterThan(0)
  })

  it('bootstraps the first super admin only once', async () => {
    const admin = await db.createUser({ email: 'owner@partivo.az' })
    await db.as('service_role', null, (tx) => q(tx, `select public.bootstrap_super_admin('owner@partivo.az')`))
    await expect(db.as('service_role', null, (tx) => q(tx, `select public.bootstrap_super_admin('buyer@example.test')`))).rejects.toThrow(/super_admin_exists/)
    const perms = await db.as('authenticated', admin, (tx) => q<{ p: string[] }>(tx, 'select public.my_permissions() as p'))
    expect(perms[0].p).toContain('staff.manage')
  })
})
