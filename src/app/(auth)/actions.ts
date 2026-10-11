'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl, isSupabaseConfigured } from '@/lib/env'
import { rateLimit } from '@/lib/rate-limit'
import { fieldErrors } from '@/lib/validation/listing'
import { loginSchema, newPasswordSchema, registerSchema, resetRequestSchema } from '@/lib/validation/forms'
import { t } from '@/i18n'

export interface FormState {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
  values?: Record<string, string>
}

/** Only allow same-origin relative redirects ("/hesab"), never "//evil.com" or absolute URLs. */
function safeNext(next: unknown, fallback = '/hesab'): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return { message: t.errors.notConfigured }
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  const values = { email: String(formData.get('email') ?? '') }
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values }
  if (!(await rateLimit('login'))) return { message: t.errors.rateLimited, values }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password })
  if (error) {
    if (error.code === 'email_not_confirmed') {
      return { message: 'E-poçt ünvanınız hələ təsdiqlənməyib. Poçtunuza göndərilən linkə keçin.', values }
    }
    return { message: 'E-poçt və ya şifrə yanlışdır.', values }
  }
  redirect(safeNext(parsed.data.next))
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return { message: t.errors.notConfigured }
  const raw = Object.fromEntries(formData)
  const values = { email: String(raw.email ?? ''), display_name: String(raw.display_name ?? '') }
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values }
  if (!(await rateLimit('register'))) return { message: t.errors.rateLimited, values }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: absoluteUrl('/auth/confirm?next=/hesab'),
      data: { display_name: parsed.data.display_name },
    },
  })
  if (error) {
    if (error.code === 'weak_password') return { errors: { password: 'Şifrə çox zəifdir. Daha mürəkkəb şifrə seçin.' }, values }
    if (error.code === 'over_email_send_rate_limit') return { message: t.errors.rateLimited, values }
    console.error('[auth] signUp failed', error.code)
    return { message: t.errors.generic, values }
  }
  // Same response whether or not the address already exists, to avoid account enumeration.
  return {
    ok: true,
    message: `${parsed.data.email} ünvanına təsdiq linki göndərdik. Hesabı aktivləşdirmək üçün linkə keçin.`,
  }
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/')
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return { message: t.errors.notConfigured }
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }
  if (!(await rateLimit('passwordReset'))) return { message: t.errors.rateLimited }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: absoluteUrl('/auth/confirm?next=/sifre-yenile'),
  })
  return {
    ok: true,
    message: 'Bu e-poçtla hesab mövcuddursa, şifrəni yeniləmək üçün link göndərildi. Poçtunuzu yoxlayın.',
  }
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return { message: t.errors.notConfigured }
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) return { message: 'Link etibarsızdır və ya müddəti bitib. Yenidən şifrə bərpası tələb edin.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    if (error.code === 'same_password') return { errors: { password: 'Yeni şifrə köhnə şifrədən fərqli olmalıdır.' } }
    return { message: t.errors.generic }
  }
  redirect('/hesab?password=updated')
}
