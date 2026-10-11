import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { IMAGE_ERRORS, ImageValidationError, processAvatar } from '@/lib/images'
import { AVATAR_BUCKET } from '@/lib/storage'
import { t } from '@/i18n'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ ok: false, message: t.errors.not_authenticated }, { status: 401 })
  if (!(await rateLimit('imageUpload', user.id))) return NextResponse.json({ ok: false, message: t.errors.rateLimited }, { status: 429 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: 'Fayl seçilməyib.' }, { status: 400 })

  let buffer: Buffer
  try {
    buffer = await processAvatar(Buffer.from(await file.arrayBuffer()))
  } catch (error) {
    if (error instanceof ImageValidationError) return NextResponse.json({ ok: false, message: IMAGE_ERRORS[error.code] }, { status: 422 })
    throw error
  }

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('avatar_path').eq('id', user.id).single()
  const path = `${user.id}/${randomUUID()}.webp`
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buffer, { contentType: 'image/webp', cacheControl: '31536000' })
  if (error) return NextResponse.json({ ok: false, message: t.errors.generic }, { status: 502 })
  await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.id)
  if (profile?.avatar_path) await supabase.storage.from(AVATAR_BUCKET).remove([profile.avatar_path as string])
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('avatar_path').eq('id', user.id).single()
  await supabase.from('profiles').update({ avatar_path: null }).eq('id', user.id)
  if (profile?.avatar_path) await supabase.storage.from(AVATAR_BUCKET).remove([profile.avatar_path as string])
  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
