'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { LISTING_BUCKET } from '@/lib/storage'
import { fieldErrors, listingDraftSchema, listingPublishSchema, type ListingInput } from '@/lib/validation/listing'
import { errorMessage, t } from '@/i18n'

export interface SaveResult {
  ok: boolean
  id?: string
  status?: string
  message?: string
  errors?: Record<string, string>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function columns(data: ReturnType<typeof listingDraftSchema.parse>) {
  const { contact_phone: _phone, ...rest } = data
  void _phone
  return rest
}

async function persist(listingId: string | null, input: ListingInput, mode: 'draft' | 'publish'): Promise<SaveResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: t.errors.not_authenticated }

  const schema = mode === 'publish' ? listingPublishSchema : listingDraftSchema
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: 'Formada səhvlər var.' }
  const data = parsed.data
  const supabase = await createClient()

  let id = listingId
  if (id) {
    if (!UUID.test(id)) return { ok: false, message: t.errors.not_found }
    // RLS restricts the update to the owner's own listing.
    const { data: updated, error } = await supabase.from('listings').update(columns(data)).eq('id', id).eq('owner_id', user.id).select('id').maybeSingle()
    if (error) return { ok: false, message: errorMessage(error.message) }
    if (!updated) return { ok: false, message: t.errors.not_found }
  } else {
    if (!(await rateLimit('listingCreate', user.id))) return { ok: false, message: t.errors.rateLimited }
    const { data: created, error } = await supabase
      .from('listings')
      .insert({ ...columns(data), owner_id: user.id })
      .select('id')
      .single()
    if (error) return { ok: false, message: errorMessage(error.message) }
    id = created.id as string
  }

  if (data.contact_phone) {
    // Update-then-insert instead of upsert: owners may only UPDATE the phone column (column grant),
    // and PostgREST's ON CONFLICT DO UPDATE would also try to update listing_id/owner_id.
    const { data: updated, error: updateError } = await supabase
      .from('listing_contacts')
      .update({ phone: data.contact_phone })
      .eq('listing_id', id)
      .select('listing_id')
    let error = updateError
    if (!error && !updated?.length) {
      ;({ error } = await supabase.from('listing_contacts').insert({ listing_id: id, owner_id: user.id, phone: data.contact_phone }))
    }
    if (error) return { ok: false, id: id ?? undefined, message: errorMessage(error.message) }
  }

  revalidatePath('/hesab/elanlar')
  return { ok: true, id: id ?? undefined }
}

export async function saveDraftAction(listingId: string | null, input: ListingInput): Promise<SaveResult> {
  return persist(listingId, input, 'draft')
}

/** Saves the latest edits, then asks the database to publish (it re-checks every rule, incl. photo count). */
export async function publishListingAction(listingId: string, input: ListingInput): Promise<SaveResult> {
  const saved = await persist(listingId, input, 'publish')
  if (!saved.ok || !saved.id) return saved
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('publish_listing', { p_listing_id: saved.id })
  if (error) return { ok: false, id: saved.id, message: errorMessage(error.message) }
  revalidatePath('/hesab/elanlar')
  revalidatePath('/')
  return { ok: true, id: saved.id, status: data as string }
}

/** Saves edits to an already published/paused listing without changing its lifecycle status. */
export async function updateListingAction(listingId: string, input: ListingInput): Promise<SaveResult> {
  const result = await persist(listingId, input, 'publish')
  if (result.ok) {
    const supabase = await createClient()
    const { data } = await supabase.from('listings').select('status, ref_no, slug').eq('id', listingId).maybeSingle()
    revalidatePath(`/elan/${data?.ref_no}-${data?.slug}`)
    return { ...result, status: data?.status as string | undefined }
  }
  return result
}

export async function changeListingStatusAction(
  listingId: string,
  action: 'pause' | 'resume' | 'mark_sold' | 'renew' | 'withdraw',
): Promise<SaveResult> {
  if (!UUID.test(listingId)) return { ok: false, message: t.errors.not_found }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('change_listing_status', { p_listing_id: listingId, p_action: action })
  if (error) return { ok: false, message: errorMessage(error.message) }
  revalidatePath('/hesab/elanlar')
  return { ok: true, status: data as string }
}

export async function deleteListingAction(listingId: string): Promise<SaveResult> {
  const user = await getSessionUser()
  if (!user || !UUID.test(listingId)) return { ok: false, message: t.errors.not_found }
  const supabase = await createClient()
  const { data: images } = await supabase
    .from('listing_images')
    .select('storage_path, thumb_path')
    .eq('listing_id', listingId)
    .eq('owner_id', user.id)
  const paths = ((images ?? []) as { storage_path: string; thumb_path: string }[]).flatMap((i) => [i.storage_path, i.thumb_path])

  const { error, count } = await supabase.from('listings').delete({ count: 'exact' }).eq('id', listingId).eq('owner_id', user.id)
  if (error || !count) return { ok: false, message: error ? errorMessage(error.message) : t.errors.not_found }
  // Storage RLS only lets the owner remove objects under their own folder.
  if (paths.length) await supabase.storage.from(LISTING_BUCKET).remove(paths)
  revalidatePath('/hesab/elanlar')
  return { ok: true }
}

export async function deleteImageAction(imageId: string): Promise<SaveResult> {
  const user = await getSessionUser()
  if (!user || !UUID.test(imageId)) return { ok: false, message: t.errors.not_found }
  const supabase = await createClient()
  const { data: image } = await supabase
    .from('listing_images')
    .select('id, listing_id, storage_path, thumb_path')
    .eq('id', imageId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!image) return { ok: false, message: t.errors.not_found }
  const { error } = await supabase.from('listing_images').delete().eq('id', imageId)
  if (error) return { ok: false, message: errorMessage(error.message) }
  await supabase.storage.from(LISTING_BUCKET).remove([image.storage_path as string, image.thumb_path as string])

  // Re-pack positions so the first remaining image becomes the cover.
  const { data: rest } = await supabase.from('listing_images').select('id').eq('listing_id', image.listing_id).order('position')
  const ids = ((rest ?? []) as { id: string }[]).map((r) => r.id)
  if (ids.length) await supabase.rpc('reorder_listing_images', { p_listing_id: image.listing_id, p_image_ids: ids })
  return { ok: true }
}

export async function reorderImagesAction(listingId: string, imageIds: string[]): Promise<SaveResult> {
  if (!UUID.test(listingId) || !imageIds.every((id) => UUID.test(id))) return { ok: false, message: t.errors.generic }
  const supabase = await createClient()
  const { error } = await supabase.rpc('reorder_listing_images', { p_listing_id: listingId, p_image_ids: imageIds })
  if (error) return { ok: false, message: errorMessage(error.message) }
  return { ok: true }
}
