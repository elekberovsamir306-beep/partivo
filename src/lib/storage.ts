import { publicEnv } from '@/lib/env'

export const LISTING_BUCKET = 'listing-images'
export const AVATAR_BUCKET = 'avatars'

/** Public URL of an object in a public Supabase Storage bucket. */
export function storageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path || !publicEnv.supabaseUrl) return null
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/${bucket}/${encoded}`
}

export const listingImageUrl = (path: string | null | undefined) => storageUrl(LISTING_BUCKET, path)
export const avatarUrl = (path: string | null | undefined) => storageUrl(AVATAR_BUCKET, path)
