import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'
import type { PromotionPackage } from '@/lib/types'

export const getActivePackages = cache(async (): Promise<PromotionPackage[]> => {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('promotion_packages')
    .select('id, code, name, description, features, price, currency, duration_days, placements, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  return ((data ?? []) as PromotionPackage[]).map((p) => ({ ...p, price: Number(p.price) }))
})
