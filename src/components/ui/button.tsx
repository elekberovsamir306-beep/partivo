import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'whatsapp'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-hover shadow-[0_8px_24px_-12px_var(--accent)] active:translate-y-px',
  secondary: 'bg-surface-2 text-fg hover:bg-surface-3 border border-line',
  outline: 'border border-line-strong text-fg hover:border-fg hover:bg-surface-2',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
  whatsapp: 'bg-whatsapp text-white hover:opacity-90',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return [
    'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-[background,color,border,opacity,transform] duration-150',
    'disabled:opacity-50 disabled:pointer-events-none select-none',
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(' ')
}

type ButtonProps = ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean }

export function Button({ variant, size, loading, className = '', children, disabled, ...props }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  className = '',
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  )
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
