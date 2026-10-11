import type { ReactNode } from 'react'
import { AlertIcon, CheckIcon, InfoIcon } from '@/components/icons'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const STYLES: Record<Tone, string> = {
  info: 'border-line bg-surface-2',
  success: 'border-transparent bg-success-soft',
  warning: 'border-transparent bg-warning-soft',
  danger: 'border-transparent bg-danger-soft',
}

const ICON_COLOR: Record<Tone, string> = {
  info: 'text-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
}

export function Alert({ tone = 'info', title, children }: { tone?: Tone; title?: ReactNode; children?: ReactNode }) {
  const Icon = tone === 'success' ? CheckIcon : tone === 'info' ? InfoIcon : AlertIcon
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-4 text-sm text-fg ${STYLES[tone]}`}>
      <Icon className={`mt-0.5 shrink-0 ${ICON_COLOR[tone]}`} size={18} />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed text-muted">{children}</div> : null}
      </div>
    </div>
  )
}
