import type { ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'

export function AdminHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

/** Shows ?ok= / ?error= feedback set by admin server actions. */
export function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  const ok = typeof params.ok === 'string' ? params.ok : null
  const error = typeof params.error === 'string' ? params.error : null
  if (!ok && !error) return null
  return <div className="mb-5">{error ? <Alert tone="danger">{error}</Alert> : <Alert tone="success">{ok}</Alert>}</div>
}

export const th = 'px-4 py-3 text-left text-xs font-semibold tracking-wider text-subtle uppercase'
export const td = 'px-4 py-3 align-top'
export const smallBtn =
  'inline-flex h-8 items-center rounded-lg border border-line px-3 text-xs font-semibold text-fg transition-colors hover:bg-surface-2'
