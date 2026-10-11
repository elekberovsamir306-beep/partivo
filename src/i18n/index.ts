import { az, type Messages } from './az'

export const locales = ['az'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'az'

const dictionaries: Record<Locale, Messages> = { az }

/** Returns the dictionary for a locale. Only Azerbaijani ships today; ru/en can be added to `dictionaries`. */
export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}

export const t = getMessages()

/** Maps a database/RPC error message (e.g. "not_enough_photos") to user-facing text. */
export function errorMessage(code: string | null | undefined): string {
  if (!code) return t.errors.generic
  const key = Object.keys(t.errors).find((k) => code === k || code.includes(k))
  return key ? t.errors[key] : t.errors.generic
}
