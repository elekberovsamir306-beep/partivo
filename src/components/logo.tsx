import { useId } from 'react'

/** Partivo mark: a hex nut (mechanical precision) carrying a "P" monogram, with an electric-orange bolt dot. */
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  // Unique gradient id per instance: a duplicate id inside a hidden <dialog> would blank out every logo.
  const gradientId = `pv-metal-${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="0.45" stopColor="#a7aeb8" />
          <stop offset="0.7" stopColor="#e3e6ea" />
          <stop offset="1" stopColor="#7f8691" />
        </linearGradient>
      </defs>
      <path
        d="M14.2 2.6a3.6 3.6 0 0 1 3.6 0l8.5 4.9a3.6 3.6 0 0 1 1.8 3.1v9.8a3.6 3.6 0 0 1-1.8 3.1l-8.5 4.9a3.6 3.6 0 0 1-3.6 0l-8.5-4.9a3.6 3.6 0 0 1-1.8-3.1v-9.8a3.6 3.6 0 0 1 1.8-3.1z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M12.6 22.5V9.6h4.6a4.15 4.15 0 0 1 0 8.3h-4.6"
        fill="none"
        stroke="#0b0c0e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20.6" cy="22.2" r="1.9" fill="#ff6b1a" />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.35rem] leading-none font-extrabold tracking-[-0.04em] text-fg">
        partivo<span className="text-accent">.</span>
      </span>
    </span>
  )
}
