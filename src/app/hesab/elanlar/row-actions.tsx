'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { buttonClass } from '@/components/ui/button'
import { changeListingStatusAction, deleteListingAction } from './actions'

type Action = 'pause' | 'resume' | 'mark_sold' | 'renew' | 'withdraw'

export function ListingRowActions({ id, status, canRenew }: { id: string; status: string; canRenew: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (action: Action) =>
    startTransition(async () => {
      setError(null)
      const result = await changeListingStatusAction(id, action)
      if (!result.ok) setError(result.message ?? 'Xəta')
      router.refresh()
    })

  const remove = () => {
    if (!window.confirm('Elan və bütün şəkilləri birdəfəlik silinəcək. Davam edilsin?')) return
    startTransition(async () => {
      const result = await deleteListingAction(id)
      if (!result.ok) setError(result.message ?? 'Xəta')
      router.refresh()
    })
  }

  const sm = (variant: Parameters<typeof buttonClass>[0] = 'secondary') => buttonClass(variant, 'sm')

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {status !== 'removed' && status !== 'sold' ? (
          <Link href={`/hesab/elanlar/${id}/redakte`} className={sm()}>
            {status === 'draft' ? 'Davam et' : 'Redaktə'}
          </Link>
        ) : null}
        {status === 'active' ? (
          <Link href={`/hesab/elanlar/${id}/irelilet`} className={sm('primary')}>
            İrəli çək
          </Link>
        ) : null}
        {status === 'active' ? (
          <button type="button" className={sm('ghost')} disabled={pending} onClick={() => run('pause')}>Dayandır</button>
        ) : null}
        {status === 'paused' ? (
          <button type="button" className={sm('ghost')} disabled={pending} onClick={() => run('resume')}>Aktivləşdir</button>
        ) : null}
        {canRenew ? (
          <button type="button" className={sm('outline')} disabled={pending} onClick={() => run('renew')}>Yenilə</button>
        ) : null}
        {status === 'pending' ? (
          <button type="button" className={sm('ghost')} disabled={pending} onClick={() => run('withdraw')}>Geri çək</button>
        ) : null}
        {['active', 'paused', 'expired'].includes(status) ? (
          <button type="button" className={sm('ghost')} disabled={pending} onClick={() => run('mark_sold')}>Satıldı</button>
        ) : null}
        <button type="button" className={`${sm('ghost')} hover:text-danger`} disabled={pending} onClick={remove}>Sil</button>
      </div>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}
