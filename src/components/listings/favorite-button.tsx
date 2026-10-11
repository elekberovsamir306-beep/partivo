'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { HeartIcon } from '@/components/icons'
import { toggleFavoriteAction } from '@/app/actions/public'

export function FavoriteButton({
  listingId,
  initial,
  variant = 'overlay',
}: {
  listingId: string
  initial: boolean
  variant?: 'overlay' | 'full'
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [favorited, setOptimistic] = useOptimistic(initial)

  function toggle(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    startTransition(async () => {
      setOptimistic(!favorited)
      const result = await toggleFavoriteAction(listingId)
      if (result.needsLogin) router.push(`/giris?next=${encodeURIComponent(pathname)}`)
      else router.refresh()
    })
  }

  const label = favorited ? 'Seçilmişlərdən çıxar' : 'Seçilmişlərə əlavə et'

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={favorited}
        disabled={pending}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"
      >
        <HeartIcon size={18} className={favorited ? 'fill-accent text-accent' : ''} />
        {favorited ? 'Seçilmişdir' : 'Seçilmişlərə əlavə et'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={favorited}
      aria-label={label}
      title={label}
      disabled={pending}
      className="grid size-9 place-items-center rounded-full bg-[rgb(11_12_14/0.55)] text-white backdrop-blur-md transition-transform hover:scale-105"
    >
      <HeartIcon size={18} className={favorited ? 'fill-accent text-accent' : ''} />
    </button>
  )
}
