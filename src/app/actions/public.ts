'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { viewerFingerprint } from '@/lib/request'
import { getCardsByIds } from '@/lib/data/listings'
import { reportSchema } from '@/lib/validation/forms'
import { fieldErrors } from '@/lib/validation/listing'
import { isMobileAzPhone } from '@/lib/phone'
import { t } from '@/i18n'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function toggleFavoriteAction(listingId: string): Promise<{ ok: boolean; favorited?: boolean; needsLogin?: boolean }> {
  if (!UUID.test(listingId)) return { ok: false }
  const user = await getSessionUser()
  if (!user) return { ok: false, needsLogin: true }
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', user.id)
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId)
    if (error) return { ok: false }
    revalidatePath('/secilmisler')
    return { ok: true, favorited: false }
  }
  const { error } = await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId })
  if (error) return { ok: false }
  revalidatePath('/secilmisler')
  return { ok: true, favorited: true }
}

/**
 * Reveals a seller's phone number for an active listing. Numbers are never embedded in public HTML,
 * and reveals are rate-limited per visitor to slow down scraping.
 */
export async function revealContactAction(
  listingId: string,
): Promise<{ ok: true; phone: string; whatsapp: boolean; call: boolean } | { ok: false; message: string }> {
  if (!UUID.test(listingId)) return { ok: false, message: t.errors.generic }
  const user = await getSessionUser()
  if (!(await rateLimit('contactReveal', user?.id))) return { ok: false, message: t.errors.rateLimited }

  // Visibility is checked with the visitor's own RLS context first…
  const supabase = await createClient()
  const { data: listing } = await supabase
    .from('listings')
    .select('id, status, expires_at, contact_method, owner_id')
    .eq('id', listingId)
    .maybeSingle()
  const isOwner = listing && user && listing.owner_id === user.id
  const isPublic = listing && listing.status === 'active' && new Date(listing.expires_at as string) > new Date()
  if (!listing || (!isPublic && !isOwner)) return { ok: false, message: 'Elan aktiv deyil.' }

  // …then the private contact row is read with the service role.
  const { data: contact } = await createAdminClient()
    .from('listing_contacts')
    .select('phone')
    .eq('listing_id', listingId)
    .maybeSingle()
  if (!contact?.phone) return { ok: false, message: 'Satıcı əlaqə nömrəsi göstərməyib.' }

  const method = listing.contact_method as 'phone' | 'whatsapp' | 'both'
  return {
    ok: true,
    phone: contact.phone as string,
    call: method !== 'whatsapp',
    whatsapp: method !== 'phone' && isMobileAzPhone(contact.phone as string),
  }
}

export async function reportListingAction(
  _prev: { ok?: boolean; message?: string; errors?: Record<string, string> },
  formData: FormData,
): Promise<{ ok?: boolean; message?: string; errors?: Record<string, string> }> {
  const user = await getSessionUser()
  if (!user) return { message: 'Şikayət göndərmək üçün hesabınıza daxil olun.' }
  const parsed = reportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }
  if (!(await rateLimit('report', user.id))) return { message: t.errors.rateLimited }

  const supabase = await createClient()
  const { error } = await supabase.from('listing_reports').insert({
    listing_id: parsed.data.listing_id,
    reporter_id: user.id,
    reason: parsed.data.reason,
    details: parsed.data.details,
  })
  if (error) {
    if (error.code === '23505') return { ok: true, message: 'Bu elan barədə şikayətiniz artıq qeydə alınıb.' }
    return { message: t.errors.generic }
  }
  return { ok: true, message: 'Şikayətiniz qəbul edildi. Moderatorlarımız elanı yoxlayacaq.' }
}

/** Counts at most one view per visitor fingerprint per day (deduplicated in the database). */
export async function recordViewAction(listingId: string): Promise<void> {
  if (!UUID.test(listingId)) return
  try {
    const fingerprint = await viewerFingerprint(`view:${new Date().toISOString().slice(0, 10)}`)
    await createAdminClient().rpc('record_listing_view', { p_listing_id: listingId, p_viewer_hash: fingerprint })
  } catch {
    // View counting is best-effort and must never break the page.
  }
}

export async function recentlyViewedCardsAction(ids: string[]) {
  if (!Array.isArray(ids)) return []
  return getCardsByIds(ids.filter((id) => typeof id === 'string'))
}
