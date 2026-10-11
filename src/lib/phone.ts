/**
 * Azerbaijani phone numbers. Stored in E.164 (+994XXXXXXXXX).
 * Mobile operator codes: 10, 50, 51, 55, 60, 70, 77, 99. Landlines: 12 (Baku), 18 and 2X (regions).
 */
const MOBILE_CODES = new Set(['10', '50', '51', '55', '60', '70', '77', '99'])
const LANDLINE = /^(12|18|2\d)\d{7}$/

export function normalizeAzPhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  if (digits.startsWith('00')) digits = digits.slice(2)
  digits = digits.replace(/\D/g, '')

  let national: string
  if (digits.startsWith('994') && digits.length === 12) national = digits.slice(3)
  else if (digits.startsWith('0') && digits.length === 10) national = digits.slice(1)
  else if (digits.length === 9) national = digits
  else return null

  if (MOBILE_CODES.has(national.slice(0, 2)) || LANDLINE.test(national)) return `+994${national}`
  return null
}

export function isMobileAzPhone(e164: string): boolean {
  return /^\+994\d{9}$/.test(e164) && MOBILE_CODES.has(e164.slice(4, 6))
}

/** +994501234567 → "+994 50 123 45 67" */
export function formatAzPhone(e164: string): string {
  const m = /^\+994(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164)
  return m ? `+994 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164
}

export function telHref(e164: string) {
  return `tel:${e164}`
}

/** WhatsApp click-to-chat link (https://wa.me/<number>?text=...). Only for mobile numbers. */
export function whatsappHref(e164: string, message: string): string | null {
  if (!isMobileAzPhone(e164)) return null
  return `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(message)}`
}
