import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getListingSettings } from '@/lib/data/catalog'
import { IMAGE_ERRORS, ImageValidationError, MAX_UPLOAD_BYTES, processListingImage } from '@/lib/images'
import { LISTING_BUCKET, listingImageUrl } from '@/lib/storage'
import { t } from '@/i18n'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status })
}

/** Upload one listing photo. Body: multipart/form-data with "file" and optional "replace" (image id). */
export async function POST(request: Request, ctx: RouteContext<'/api/listings/[id]/images'>) {
  const { id: listingId } = await ctx.params
  if (!UUID.test(listingId)) return fail(t.errors.not_found, 404)

  const user = await getSessionUser()
  if (!user) return fail(t.errors.not_authenticated, 401)
  if (!(await rateLimit('imageUpload', user.id))) return fail(t.errors.rateLimited, 429)

  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return fail(IMAGE_ERRORS.too_large, 413)

  const supabase = await createClient()
  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, status')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!listing) return fail(t.errors.not_found, 404)
  if (listing.status === 'removed') return fail(t.errors.invalid_status, 409)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail(IMAGE_ERRORS.corrupt)
  }
  const file = form.get('file')
  const replaceId = form.get('replace')
  if (!(file instanceof File)) return fail('Fayl seçilməyib.')
  if (replaceId !== null && (typeof replaceId !== 'string' || !UUID.test(replaceId))) return fail(t.errors.generic)

  const settings = await getListingSettings()
  const { data: existing } = await supabase
    .from('listing_images')
    .select('id, position, storage_path, thumb_path')
    .eq('listing_id', listingId)
    .order('position')
  const images = (existing ?? []) as { id: string; position: number; storage_path: string; thumb_path: string }[]
  const replacing = replaceId ? images.find((i) => i.id === replaceId) : undefined
  if (replaceId && !replacing) return fail(t.errors.not_found, 404)
  if (!replacing && images.length >= settings.max_photos) return fail(`Ən çox ${settings.max_photos} şəkil yükləmək olar.`, 409)

  let processed
  try {
    processed = await processListingImage(Buffer.from(await file.arrayBuffer()))
  } catch (error) {
    if (error instanceof ImageValidationError) return fail(IMAGE_ERRORS[error.code], 422)
    throw error
  }

  const base = `${user.id}/${listingId}/${randomUUID()}`
  const fullPath = `${base}.webp`
  const thumbPath = `${base}-thumb.webp`
  const bucket = supabase.storage.from(LISTING_BUCKET)
  const upload = await Promise.all([
    bucket.upload(fullPath, processed.full, { contentType: 'image/webp', cacheControl: '31536000', upsert: false }),
    bucket.upload(thumbPath, processed.thumb, { contentType: 'image/webp', cacheControl: '31536000', upsert: false }),
  ])
  if (upload.some((u) => u.error)) {
    await bucket.remove([fullPath, thumbPath])
    console.error('[upload] storage error', upload.map((u) => u.error?.message))
    return fail('Şəkli yaddaşa yazmaq alınmadı. Yenidən cəhd edin.', 502)
  }

  const position = replacing ? replacing.position : images.length ? Math.max(...images.map((i) => i.position)) + 1 : 0
  if (replacing) {
    await supabase.from('listing_images').delete().eq('id', replacing.id)
  }
  const { data: row, error } = await supabase
    .from('listing_images')
    .insert({
      listing_id: listingId,
      owner_id: user.id,
      storage_path: fullPath,
      thumb_path: thumbPath,
      width: processed.width,
      height: processed.height,
      size_bytes: processed.full.byteLength,
      content_hash: processed.hash,
      position,
    })
    .select('id, position, storage_path, thumb_path, width, height')
    .single()
  if (error) {
    await bucket.remove([fullPath, thumbPath])
    return fail(t.errors.generic, 500)
  }
  if (replacing) await bucket.remove([replacing.storage_path, replacing.thumb_path])

  return NextResponse.json({
    ok: true,
    image: {
      id: row.id,
      position: row.position,
      url: listingImageUrl(row.storage_path as string),
      thumbUrl: listingImageUrl(row.thumb_path as string),
      width: row.width,
      height: row.height,
    },
  })
}
