'use server'

import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/env'
import { rateLimit } from '@/lib/rate-limit'
import { getPaymentProvider, supabasePaymentRepo } from '@/lib/payments'
import { startCheckout } from '@/lib/payments/service'
import { promotionCheckoutSchema } from '@/lib/validation/forms'
import { errorMessage, t } from '@/i18n'

export async function startCheckoutAction(_prev: { message?: string }, formData: FormData): Promise<{ message?: string }> {
  const user = await getSessionUser()
  if (!user) return { message: t.errors.not_authenticated }
  const parsed = promotionCheckoutSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { message: 'Paket seçin.' }
  if (!(await rateLimit('checkout', user.id))) return { message: t.errors.rateLimited }

  const status = getPaymentProvider()
  if (!status.ready) return { message: t.errors.payments_unavailable }

  const supabase = await createClient()
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, owner_id')
    .eq('id', parsed.data.listing_id)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!listing) return { message: t.errors.not_found }

  let redirectUrl: string
  try {
    // Amount, duration and placements are read from the database inside create_promotion_order.
    const result = await startCheckout(
      { repo: supabasePaymentRepo(), provider: status.provider },
      { userId: user.id, listingId: listing.id as string, packageId: parsed.data.package_id, listingTitle: listing.title as string },
      (paymentId) => ({
        successUrl: absoluteUrl(`/odenis/netice?payment=${paymentId}`),
        errorUrl: absoluteUrl(`/odenis/netice?payment=${paymentId}&cancelled=1`),
      }),
    )
    redirectUrl = result.redirectUrl
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    console.error('[checkout] failed', message)
    if (/package_unavailable|listing_not_active|account_suspended|not_found/.test(message)) return { message: errorMessage(message) }
    return { message: 'Ödəniş səhifəsini açmaq alınmadı. Bir az sonra yenidən cəhd edin.' }
  }
  redirect(redirectUrl)
}
