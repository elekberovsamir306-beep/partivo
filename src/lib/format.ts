const TZ = 'Asia/Baku'

const priceFormatter = new Intl.NumberFormat('az-AZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Razılaşma ilə'
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return '—'
  // Use a regular space as the thousands separator for consistent rendering across browsers.
  return `${priceFormatter.format(n).replace(/[  .]/g, ' ')} ₼`
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']

function bakuParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour') % 24, min: get('minute') }
}

/** "10 oktyabr 2026" (Baku time). Implemented manually so server and browser produce identical output. */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const p = bakuParts(new Date(input))
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`
}

export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const p = bakuParts(new Date(input))
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}, ${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`
}

/** "Bu gün, 14:05" / "Dünən, 09:30" / "3 oktyabr" relative to `now`. */
export function formatRelative(input: string | Date, now: Date = new Date()): string {
  const p = bakuParts(new Date(input))
  const n = bakuParts(now)
  const time = `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`
  const dayIndex = (x: { y: number; m: number; d: number }) => Date.UTC(x.y, x.m - 1, x.d) / 86_400_000
  const diff = dayIndex(n) - dayIndex(p)
  if (diff === 0) return `Bu gün, ${time}`
  if (diff === 1) return `Dünən, ${time}`
  return p.y === n.y ? `${p.d} ${MONTHS[p.m - 1]}` : `${p.d} ${MONTHS[p.m - 1]} ${p.y}`
}

export function formatNumber(n: number) {
  return priceFormatter.format(n).replace(/[  .]/g, ' ')
}

/** True when the timestamp is in the future. Kept out of components so render code stays pure. */
export function isFuture(input: string | Date | null | undefined): boolean {
  return Boolean(input) && new Date(input as string).getTime() > Date.now()
}

/** Days from now until the timestamp (negative when in the past). */
export function daysUntil(input: string | Date): number {
  return (new Date(input).getTime() - Date.now()) / 86_400_000
}
