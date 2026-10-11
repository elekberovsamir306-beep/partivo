'use client'

import { MoonIcon, SunIcon } from '@/components/icons'
import { t } from '@/i18n'

function currentTheme(): 'light' | 'dark' {
  const explicit = document.documentElement.dataset.theme
  if (explicit === 'light' || explicit === 'dark') return explicit
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeToggle() {
  function toggle() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('partivo-theme', next)
    } catch {
      // storage may be unavailable (private mode); the theme still applies for this page view
    }
  }

  // Both icons render; CSS shows the relevant one so server and client markup always match.
  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      aria-label={`${t.nav.themeLight} / ${t.nav.themeDark}`}
      title="Tema"
    >
      <SunIcon className="theme-icon-sun" />
      <MoonIcon className="theme-icon-moon" />
    </button>
  )
}
