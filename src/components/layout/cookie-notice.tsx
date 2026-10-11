'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

const KEY = 'partivo-cookie-notice'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return 'unavailable'
  }
}

/**
 * Partivo currently uses only strictly necessary cookies (session, security), so this is an
 * informational notice rather than a consent gate. Add a consent choice here before enabling
 * any analytics or marketing cookies.
 */
export function CookieNotice() {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => 'server',
  )
  if (value !== null) return null

  function dismiss() {
    try {
      localStorage.setItem(KEY, 'ack')
    } catch {}
    listeners.forEach((l) => l())
  }

  return (
    <div role="region" aria-label="Kuki bildirişi" className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:max-w-sm">
      <div className="rounded-2xl border border-line bg-elevated p-4 text-sm shadow-float">
        <p className="leading-relaxed text-muted">
          Sayt yalnız işləməsi üçün zəruri kukilərdən istifadə edir. Ətraflı:{' '}
          <Link href="/cookie-siyaseti" className="font-medium text-accent-text underline-offset-4 hover:underline">
            kuki siyasəti
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 h-9 rounded-lg bg-surface-3 px-4 text-sm font-semibold text-fg transition-colors hover:bg-accent hover:text-accent-ink"
        >
          Aydındır
        </button>
      </div>
    </div>
  )
}
