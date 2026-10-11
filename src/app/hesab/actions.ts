'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/auth'
import { publicEnv } from '@/lib/env'
import { AVATAR_BUCKET, LISTING_BUCKET } from '@/lib/storage'
import { contactSettingsSchema, profileSchema } from '@/lib/validation/forms'
import { fieldErrors } from '@/lib/validation/listing'
import { normalizeAzPhone } from '@/lib/phone'
import { errorMessage, t } from '@/i18n'

export interface ActionState {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser()
  if (!user) return { message: t.errors.not_authenticated }
  const parsed = profileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }
  const supabase = await createClient()
  // Column grants only allow these profile fields; trust flags cannot be changed here.
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id)
  if (error) return { message: errorMessage(error.message) }
  revalidatePath('/hesab', 'layout')
  return { ok: true, message: 'Profil yeniləndi.' }
}

export async function updateContactSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser()
  if (!user) return { message: t.errors.not_authenticated }
  const parsed = contactSettingsSchema.safeParse({
    phone: String(formData.get('phone') ?? ''),
    default_contact_method: formData.get('default_contact_method'),
    email_notifications: formData.get('email_notifications') === 'on',
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }
  const supabase = await createClient()
  const { error } = await supabase.from('profile_private').update(parsed.data).eq('id', user.id)
  if (error) return { message: errorMessage(error.message) }
  revalidatePath('/hesab/profil')
  return { ok: true, message: 'Əlaqə ayarları yadda saxlanıldı.' }
}

/** Phone verification via Supabase Auth SMS OTP. Requires an SMS provider configured in Supabase. */
export async function sendPhoneOtpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!publicEnv.phoneVerificationEnabled) return { message: 'Telefon təsdiqi hələ aktiv deyil.' }
  const user = await getSessionUser()
  if (!user) return { message: t.errors.not_authenticated }
  const phone = normalizeAzPhone(String(formData.get('phone') ?? ''))
  if (!phone) return { errors: { phone: 'Düzgün nömrə daxil edin' } }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ phone })
  if (error) return { message: error.code === 'over_sms_send_rate_limit' ? t.errors.rateLimited : 'SMS göndərilmədi. Bir az sonra yenidən cəhd edin.' }
  return { ok: true, message: `${phone} nömrəsinə SMS kodu göndərildi.` }
}

export async function verifyPhoneOtpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!publicEnv.phoneVerificationEnabled) return { message: 'Telefon təsdiqi hələ aktiv deyil.' }
  const phone = normalizeAzPhone(String(formData.get('phone') ?? ''))
  const token = String(formData.get('token') ?? '').replace(/\D/g, '')
  if (!phone || token.length < 4) return { errors: { token: 'SMS kodunu daxil edin' } }
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' })
  if (error) return { errors: { token: 'Kod yanlışdır və ya müddəti bitib' } }
  // A database trigger copies the confirmed phone from auth.users into profile_private.
  revalidatePath('/hesab/profil')
  return { ok: true, message: 'Telefon nömrəniz təsdiqləndi.' }
}

export async function markNotificationsReadAction(ids?: string[]) {
  const user = await getSessionUser()
  if (!user) return
  const supabase = await createClient()
  let query = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
  if (ids?.length) query = query.in('id', ids.slice(0, 200))
  await query
  revalidatePath('/', 'layout')
}

export async function deleteNotificationAction(id: string) {
  const user = await getSessionUser()
  if (!user) return
  const supabase = await createClient()
  await supabase.from('notifications').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/hesab/bildirisler')
}

async function removeFolder(bucket: string, prefix: string) {
  const admin = createAdminClient()
  // Storage has no recursive delete: walk the user's folder tree.
  const queue = [prefix]
  while (queue.length) {
    const folder = queue.shift()!
    const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 })
    const files: string[] = []
    for (const item of data ?? []) {
      if (item.id) files.push(`${folder}/${item.name}`)
      else queue.push(`${folder}/${item.name}`)
    }
    if (files.length) await admin.storage.from(bucket).remove(files)
  }
}

/**
 * Permanently deletes the account. Listings, images, favorites and personal data cascade from auth.users;
 * payment records are kept with user_id = NULL for accounting.
 */
export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getSessionUser()
  if (!user) return { message: t.errors.not_authenticated }
  if (String(formData.get('confirm') ?? '').trim().toLocaleUpperCase('az') !== 'SİL') {
    return { errors: { confirm: 'Təsdiq üçün "SİL" yazın' } }
  }
  const password = String(formData.get('password') ?? '')
  const supabase = await createClient()
  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email ?? '', password })
  if (authError) return { errors: { password: 'Şifrə yanlışdır' } }

  const admin = createAdminClient()
  const { data: staff } = await admin.from('staff_roles').select('role').eq('user_id', user.id)
  if ((staff ?? []).length) return { message: 'Heyət üzvlərinin hesabı silinməzdən əvvəl rolları götürülməlidir.' }

  await removeFolder(LISTING_BUCKET, user.id)
  await removeFolder(AVATAR_BUCKET, user.id)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { message: t.errors.generic }
  await supabase.auth.signOut()
  redirect('/?account=deleted')
}
