import { useId, type ComponentProps, type ReactNode } from 'react'

interface FieldProps {
  label: ReactNode
  error?: string | null
  hint?: ReactNode
  optional?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode
}

/** Accessible label + control + hint/error wiring. */
export function Field({ label, error, hint, optional, className = '', children }: FieldProps) {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {optional ? <span className="ml-1 font-normal text-subtle">(istəyə bağlı)</span> : null}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`field ${className}`} {...props} />
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`field ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`field min-h-32 resize-y leading-relaxed ${className}`} {...props} />
}

export function Checkbox({ label, className = '', ...props }: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 text-sm text-fg ${className}`}>
      <input type="checkbox" className="mt-0.5 size-4.5 shrink-0 accent-[var(--accent)]" {...props} />
      <span>{label}</span>
    </label>
  )
}
