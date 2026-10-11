'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { errorMessage } from '@/i18n'

/** Every admin action re-checks the permission server-side; the database enforces it again (RLS / RPC). */
function back(path: string, result: { error?: { message: string } | null }, ok = 'Yadda saxlanıldı') {
  revalidatePath(path)
  const sep = path.includes('?') ? '&' : '?'
  if (result.error) redirect(`${path}${sep}error=${encodeURIComponent(errorMessage(result.error.message))}`)
  redirect(`${path}${sep}ok=${encodeURIComponent(ok)}`)
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const returnTo = (f: FormData, fallback: string) => {
  const r = str(f, 'return_to')
  return r.startsWith('/admin') ? r : fallback
}

// Moderation ------------------------------------------------------------------
export async function moderateListingAction(formData: FormData) {
  await requirePermission('listings.moderate')
  const supabase = await createClient()
  const result = await supabase.rpc('admin_moderate_listing', {
    p_listing_id: str(formData, 'listing_id'),
    p_action: str(formData, 'action'),
    p_reason: str(formData, 'reason') || null,
  })
  back(returnTo(formData, '/admin/elanlar'), result, 'Moderasiya qərarı tətbiq edildi')
}

export async function resolveReportAction(formData: FormData) {
  await requirePermission('reports.manage')
  const supabase = await createClient()
  const result = await supabase.rpc('admin_resolve_report', {
    p_report_id: str(formData, 'report_id'),
    p_status: str(formData, 'status'),
    p_note: str(formData, 'note') || null,
    p_remove_listing: formData.get('remove_listing') === 'on',
  })
  back('/admin/sikayetler', result)
}

// Users -----------------------------------------------------------------------
export async function setSuspensionAction(formData: FormData) {
  await requirePermission('users.suspend')
  const userId = str(formData, 'user_id')
  const suspend = str(formData, 'suspend') === '1'
  const supabase = await createClient()
  const result = await supabase.rpc('admin_set_user_suspension', {
    p_user_id: userId,
    p_suspended: suspend,
    p_reason: str(formData, 'reason') || null,
  })
  if (!result.error) {
    // Also block sign-in at the auth layer (the database already hides listings and blocks writes).
    await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: suspend ? '876000h' : 'none' })
  }
  back(returnTo(formData, '/admin/istifadeciler'), result, suspend ? 'Hesab dayandırıldı' : 'Hesab bərpa olundu')
}

export async function setVerifiedAction(formData: FormData) {
  await requirePermission('users.verify')
  const supabase = await createClient()
  const result = await supabase.rpc('admin_set_user_verified', {
    p_user_id: str(formData, 'user_id'),
    p_verified: str(formData, 'verified') === '1',
  })
  back(returnTo(formData, '/admin/istifadeciler'), result)
}

export async function setStaffRoleAction(formData: FormData) {
  await requirePermission('staff.manage')
  const email = str(formData, 'email').toLowerCase()
  let userId = str(formData, 'user_id')
  if (!userId && email) {
    const { data } = await createAdminClient().from('profile_private').select('id').ilike('email', email).maybeSingle()
    userId = (data?.id as string | undefined) ?? ''
  }
  if (!userId) back('/admin/heyet', { error: { message: 'İstifadəçi tapılmadı' } })
  const supabase = await createClient()
  const result = await supabase.rpc('admin_set_staff_role', {
    p_user_id: userId,
    p_role: str(formData, 'role'),
    p_grant: str(formData, 'grant') === '1',
  })
  back('/admin/heyet', result)
}

// Payments --------------------------------------------------------------------
export async function recordRefundAction(formData: FormData) {
  const viewer = await requirePermission('payments.manage')
  const paymentId = str(formData, 'payment_id')
  const note = str(formData, 'note')
  if (note.length < 5) back('/admin/odenisler', { error: { message: 'reason_required' } })
  // refund_payment is service-role only; permission was verified above and the action is audited.
  const result = await createAdminClient().rpc('refund_payment', { p_payment_id: paymentId, p_note: `${note} (admin: ${viewer.id})` })
  back('/admin/odenisler', result, 'Geri qaytarma qeydə alındı')
}

// Packages --------------------------------------------------------------------
const packageSchema = z.object({
  code: z.string().regex(/^[a-z0-9_-]{2,32}$/),
  name: z.string().min(2).max(60),
  description: z.string().max(500),
  features: z.string().transform((s) => s.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 8)),
  price: z.coerce.number().positive().max(10000),
  duration_days: z.coerce.number().int().min(1).max(365),
  placements: z.array(z.enum(['search_top', 'vip_section', 'homepage', 'highlight'])).min(1),
  sort_order: z.coerce.number().int().min(0).max(1000),
  is_active: z.boolean(),
})

export async function savePackageAction(formData: FormData) {
  await requirePermission('packages.manage')
  const parsed = packageSchema.safeParse({
    code: str(formData, 'code'),
    name: str(formData, 'name'),
    description: str(formData, 'description'),
    features: str(formData, 'features'),
    price: str(formData, 'price').replace(',', '.'),
    duration_days: str(formData, 'duration_days'),
    placements: formData.getAll('placements').map(String),
    sort_order: str(formData, 'sort_order') || '100',
    is_active: formData.get('is_active') === 'on',
  })
  if (!parsed.success) back('/admin/paketler', { error: { message: 'Paket məlumatları yanlışdır: ' + parsed.error.issues.map((i) => i.path.join('.')).join(', ') } })
  const supabase = await createClient()
  const id = str(formData, 'id')
  const result = id
    ? await supabase.from('promotion_packages').update(parsed.data!).eq('id', Number(id))
    : await supabase.from('promotion_packages').insert(parsed.data!)
  back('/admin/paketler', result)
}

// Catalog ---------------------------------------------------------------------
const slug = z.string().regex(/^[a-z0-9-]{1,80}$/)

export async function saveCategoryAction(formData: FormData) {
  await requirePermission('catalog.manage')
  const parsed = z
    .object({ slug, name: z.string().min(2).max(80), parent_id: z.coerce.number().int().positive().nullable(), sort_order: z.coerce.number().int(), is_active: z.boolean() })
    .safeParse({
      slug: str(formData, 'slug'),
      name: str(formData, 'name'),
      parent_id: str(formData, 'parent_id') || null,
      sort_order: str(formData, 'sort_order') || '100',
      is_active: formData.get('is_active') === 'on',
    })
  if (!parsed.success) back('/admin/kataloq', { error: { message: 'Kateqoriya məlumatları yanlışdır' } })
  const supabase = await createClient()
  const id = str(formData, 'id')
  const result = id
    ? await supabase.from('categories').update(parsed.data!).eq('id', Number(id))
    : await supabase.from('categories').insert(parsed.data!)
  back('/admin/kataloq', result)
}

export async function saveMakeAction(formData: FormData) {
  await requirePermission('catalog.manage')
  const parsed = z
    .object({ slug, name: z.string().min(1).max(60), is_popular: z.boolean(), is_active: z.boolean() })
    .safeParse({ slug: str(formData, 'slug'), name: str(formData, 'name'), is_popular: formData.get('is_popular') === 'on', is_active: formData.get('is_active') === 'on' })
  if (!parsed.success) back('/admin/kataloq', { error: { message: 'Marka məlumatları yanlışdır' } })
  const supabase = await createClient()
  const id = str(formData, 'id')
  const result = id
    ? await supabase.from('vehicle_makes').update(parsed.data!).eq('id', Number(id))
    : await supabase.from('vehicle_makes').insert(parsed.data!)
  back('/admin/kataloq', result)
}

export async function saveModelAction(formData: FormData) {
  await requirePermission('catalog.manage')
  const parsed = z
    .object({ make_id: z.coerce.number().int().positive(), slug, name: z.string().min(1).max(60) })
    .safeParse({ make_id: str(formData, 'make_id'), slug: str(formData, 'slug'), name: str(formData, 'name') })
  if (!parsed.success) back('/admin/kataloq', { error: { message: 'Model məlumatları yanlışdır' } })
  const supabase = await createClient()
  back('/admin/kataloq', await supabase.from('vehicle_models').insert(parsed.data!))
}

// Support ---------------------------------------------------------------------
export async function updateSupportAction(formData: FormData) {
  const viewer = await requirePermission('support.manage')
  const status = z.enum(['open', 'in_progress', 'closed']).safeParse(str(formData, 'status'))
  if (!status.success) back('/admin/destek', { error: { message: 'invalid_status' } })
  const supabase = await createClient()
  const result = await supabase
    .from('support_requests')
    .update({ status: status.data!, staff_note: str(formData, 'staff_note') || null, assigned_to: viewer.id })
    .eq('id', str(formData, 'id'))
  back('/admin/destek', result)
}

// Content, announcements, settings ----------------------------------------------
export async function saveContentPageAction(formData: FormData) {
  const viewer = await requirePermission('content.manage')
  const title = str(formData, 'title')
  const body = String(formData.get('body') ?? '').replace(/\r\n/g, '\n').slice(0, 50000)
  if (title.length < 2) back('/admin/mezmun', { error: { message: 'Başlıq boş ola bilməz' } })
  const supabase = await createClient()
  const result = await supabase
    .from('content_pages')
    .update({ title, body, is_published: formData.get('is_published') === 'on', updated_by: viewer.id })
    .eq('slug', str(formData, 'slug'))
  back('/admin/mezmun', result)
}

export async function saveAnnouncementAction(formData: FormData) {
  await requirePermission('content.manage')
  const parsed = z
    .object({
      title: z.string().min(3).max(160),
      body: z.string().max(500).transform((v) => v || null),
      level: z.enum(['info', 'warning', 'success']),
      link: z.string().regex(/^(\/|https:\/\/)/).or(z.literal('')).transform((v) => v || null),
      is_active: z.boolean(),
    })
    .safeParse({
      title: str(formData, 'title'),
      body: str(formData, 'body'),
      level: str(formData, 'level') || 'info',
      link: str(formData, 'link'),
      is_active: formData.get('is_active') === 'on',
    })
  if (!parsed.success) back('/admin/mezmun', { error: { message: 'Elan (bildiriş) məlumatları yanlışdır' } })
  const supabase = await createClient()
  const id = str(formData, 'id')
  const result = id
    ? await supabase.from('announcements').update(parsed.data!).eq('id', Number(id))
    : await supabase.from('announcements').insert(parsed.data!)
  back('/admin/mezmun', result)
}

const listingSettingsSchema = z.object({
  duration_days: z.coerce.number().int().min(1).max(365),
  renewal_window_days: z.coerce.number().int().min(0).max(60),
  max_active_per_user: z.coerce.number().int().min(1).max(10000),
  min_photos: z.coerce.number().int().min(1).max(10),
  max_photos: z.coerce.number().int().min(1).max(30),
  require_moderation: z.boolean(),
})

export async function saveListingSettingsAction(formData: FormData) {
  const viewer = await requirePermission('settings.manage')
  const parsed = listingSettingsSchema.safeParse({
    duration_days: str(formData, 'duration_days'),
    renewal_window_days: str(formData, 'renewal_window_days'),
    max_active_per_user: str(formData, 'max_active_per_user'),
    min_photos: str(formData, 'min_photos'),
    max_photos: str(formData, 'max_photos'),
    require_moderation: formData.get('require_moderation') === 'on',
  })
  if (!parsed.success || parsed.data.min_photos > parsed.data.max_photos) back('/admin/parametrler', { error: { message: 'Parametrlər yanlışdır' } })
  const supabase = await createClient()
  back('/admin/parametrler', await supabase.from('app_settings').update({ value: parsed.data!, updated_by: viewer.id }).eq('key', 'listings'))
}

export async function saveHomepageSettingsAction(formData: FormData) {
  const viewer = await requirePermission('settings.manage')
  const keys = ['premium', 'vip', 'recent', 'categories', 'makes', 'business'] as const
  const value = {
    sections: Object.fromEntries(keys.map((k) => [k, formData.get(`section_${k}`) === 'on'])),
    popular_searches: str(formData, 'popular_searches').split('\n').map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 12),
  }
  const supabase = await createClient()
  back('/admin/parametrler', await supabase.from('app_settings').update({ value, updated_by: viewer.id }).eq('key', 'homepage'))
}
