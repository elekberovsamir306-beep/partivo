import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

/** IDs of listings the current user saved, used to render filled hearts. Empty for guests. */
export const getMyFavoriteIds = cache(async (): Promise<Set<string>> => {
  const user = await getSessionUser()
  if (!user) return new Set()
  const supabase = await createClient()
  const { data } = await supabase.from('favorites').select('listing_id').eq('user_id', user.id).limit(1000)
  return new Set(((data ?? []) as { listing_id: string }[]).map((r) => r.listing_id))
})
