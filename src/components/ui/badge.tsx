import type { ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'vip'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  accent: 'bg-accent-soft text-accent-text border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  vip: 'bg-[color-mix(in_srgb,var(--vip)_14%,transparent)] text-vip border-transparent',
}

export function Badge({ tone = 'neutral', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-5 ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

const SUCCESS = new Set(['active', 'succeeded', 'resolved', 'closed'])
const WARNING = new Set(['pending', 'pending_payment', 'open', 'reviewing', 'in_progress', 'paused', 'created'])
const DANGER = new Set(['rejected', 'removed', 'failed', 'dismissed', 'cancelled'])

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone: Tone = SUCCESS.has(status) ? 'success' : WARNING.has(status) ? 'warning' : DANGER.has(status) ? 'danger' : 'neutral'
  return <Badge tone={tone}>{label}</Badge>
}
