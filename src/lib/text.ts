/** Mirrors public.az_fold() in the database: Azerbaijani letters → ASCII, lowercase. */
const FOLD_MAP: Record<string, string> = {
  Ə: 'e', ə: 'e', Ğ: 'g', ğ: 'g', I: 'i', ı: 'i', İ: 'i', Ö: 'o', ö: 'o', Ü: 'u', ü: 'u', Ş: 's', ş: 's', Ç: 'c', ç: 'c',
}

export function foldAz(input: string): string {
  return input
    .replace(/[ƏəĞğIıİÖöÜüŞşÇç]/g, (ch) => FOLD_MAP[ch] ?? ch)
    .replace(/̇/g, '')
    .toLowerCase()
}

/** Mirrors public.slugify(). */
export function slugify(input: string): string {
  const slug = foldAz(input)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
  return slug || 'elan'
}

export function listingPath(listing: { ref_no: number | string; slug: string }) {
  return `/elan/${listing.ref_no}-${listing.slug}`
}

/** Extracts the numeric reference from "/elan/100245-bmw-e60-on-fara". */
export function parseListingParam(param: string): number | null {
  const match = /^(\d{6,12})(?:-|$)/.exec(param)
  if (!match) return null
  const n = Number(match[1])
  return Number.isSafeInteger(n) ? n : null
}

export function truncate(input: string, max: number) {
  if (input.length <= max) return input
  return `${input.slice(0, max - 1).trimEnd()}…`
}
