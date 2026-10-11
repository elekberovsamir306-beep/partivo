'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { ListingCard } from '@/components/listings/listing-card'
import { recentlyViewedCardsAction, recordViewAction } from '@/app/actions/public'
import type { ListingCard as Card } from '@/lib/types'

/**
 * Recently viewed listings are stored only in this browser (localStorage), never on the server,
 * and can be cleared by the visitor at any time.
 */
const KEY = 'partivo-recently-viewed'
const MAX = 12
const listeners = new Set<() => void>()

function readIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

function writeIds(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)))
    else localStorage.removeItem(KEY)
  } catch {}
  listeners.forEach((l) => l())
}

/** Mounted on the listing page: remembers the listing locally and counts a (deduplicated) view. */
export function TrackListingView({ listingId, countView }: { listingId: string; countView: boolean }) {
  useEffect(() => {
    writeIds([listingId, ...readIds().filter((id) => id !== listingId)])
    if (countView) void recordViewAction(listingId)
  }, [listingId, countView])
  return null
}

let snapshotCache = { raw: '', ids: [] as string[] }
function snapshot(): string[] {
  let raw = ''
  try {
    raw = localStorage.getItem(KEY) ?? ''
  } catch {}
  if (raw !== snapshotCache.raw) snapshotCache = { raw, ids: readIds() }
  return snapshotCache.ids
}
const EMPTY: string[] = []

export function RecentlyViewed() {
  const ids = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    snapshot,
    () => EMPTY,
  )
  const [cards, setCards] = useState<Card[]>([])
  const key = ids.join(',')

  useEffect(() => {
    if (!key) return
    let cancelled = false
    recentlyViewedCardsAction(key.split(',')).then((result) => {
      if (!cancelled) setCards(result)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  const visible = key ? cards.filter((c) => ids.includes(c.id)) : []
  if (!visible.length) return null

  return (
    <section aria-labelledby="recent-heading" className="container-page mt-20">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 id="recent-heading" className="text-2xl font-extrabold sm:text-3xl">
            Son baxdıqlarınız
          </h2>
          <p className="mt-1 text-sm text-muted">Yalnız bu cihazda saxlanılır.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            writeIds([])
            setCards([])
          }}
          className="text-sm font-semibold text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Tarixçəni təmizlə
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {visible.slice(0, 4).map((card) => (
          <ListingCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
}
