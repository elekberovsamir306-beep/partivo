import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="card relative overflow-hidden px-6 py-14 text-center">
      <div className="grid-noise pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
        {icon ? (
          <div className="mb-1 grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-accent-text">{icon}</div>
        ) : null}
        <h2 className="text-lg font-bold">{title}</h2>
        {description ? <div className="text-sm leading-relaxed text-muted">{description}</div> : null}
        {action ? <div className="mt-3 flex flex-wrap justify-center gap-3">{action}</div> : null}
      </div>
    </div>
  )
}
