'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { supportSchema } from '@/lib/validation/forms'
import { fieldErrors } from '@/lib/validation/listing'
import { t } from '@/i18n'

export interface ContactState {
  ok?: boolean
  message?: string
  errors?: Record<string, string>
}

export async function submitSupportAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = supportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    // A filled honeypot means a bot: pretend success without storing anything.
    if (formData.get('website')) return { ok: true, message: 'Müraciətiniz qəbul edildi.' }
    return { errors: fieldErrors(parsed.error) }
  }
  const user = await getSessionUser()
  if (!(await rateLimit('support', user?.id))) return { message: t.errors.rateLimited }

  const { website: _honeypot, ...data } = parsed.data
  void _honeypot
  const { error } = await createAdminClient().from('support_requests').insert({ ...data, user_id: user?.id ?? null })
  if (error) return { message: t.errors.generic }
  return { ok: true, message: 'Müraciətiniz qəbul edildi. Adətən 1 iş günü ərzində e-poçtla cavab veririk.' }
}
