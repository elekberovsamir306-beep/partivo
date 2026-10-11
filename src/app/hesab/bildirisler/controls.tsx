'use client'

import { useTransition } from 'react'
import { CheckIcon, TrashIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { deleteNotificationAction, markNotificationsReadAction } from '../actions'

export function NotificationControls({ mode, id, isRead }: { mode: 'all' | 'single'; id?: string; isRead?: boolean }) {
  const [pending, startTransition] = useTransition()
  if (mode === 'all') {
    return (
      <Button variant="secondary" size="sm" loading={pending} onClick={() => startTransition(() => markNotificationsReadAction())}>
        Hamısını oxunmuş et
      </Button>
    )
  }
  return (
    <div className="flex shrink-0 gap-1">
      {!isRead ? (
        <button type="button" disabled={pending} onClick={() => startTransition(() => markNotificationsReadAction([id!]))} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Oxunmuş et">
          <CheckIcon size={17} />
        </button>
      ) : null}
      <button type="button" disabled={pending} onClick={() => startTransition(() => deleteNotificationAction(id!))} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger" aria-label="Sil">
        <TrashIcon size={17} />
      </button>
    </div>
  )
}
