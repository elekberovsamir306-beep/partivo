import type { Metadata, Viewport } from 'next'
import { Inter, Inter_Tight } from 'next/font/google'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { AnnouncementBar } from '@/components/layout/announcement-bar'
import { CookieNotice } from '@/components/layout/cookie-notice'
import { publicEnv } from '@/lib/env'
import { t } from '@/i18n'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' })
const interTight = Inter_Tight({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter-tight',
  weight: ['600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: `${t.brand.name} — ${t.brand.tagline}`,
    template: `%s | ${t.brand.name}`,
  },
  description: t.brand.description,
  applicationName: t.brand.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: t.brand.name,
    locale: 'az_AZ',
    title: `${t.brand.name} — ${t.brand.tagline}`,
    description: t.brand.description,
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b0c0e' },
    { media: '(prefers-color-scheme: light)', color: '#f5f5f3' },
  ],
}

// Applies a saved theme before first paint (see Next.js "preventing flash before hydration").
const THEME_SCRIPT = `try{var t=localStorage.getItem('partivo-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az" className={`${inter.variable} ${interTight.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-accent px-4 py-2 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t.nav.skipToContent}
        </a>
        <AnnouncementBar />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CookieNotice />
      </body>
    </html>
  )
}
