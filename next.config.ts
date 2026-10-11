import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : ''
const isDev = process.env.NODE_ENV !== 'production'
// Only force HTTPS sub-resources when the site itself is served over HTTPS (not for local `next start`).
const isHttpsSite = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://')

const csp = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; the theme script is inline too.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace('https://', 'wss://')}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  // Payment redirects go to the provider's / bank's HTTPS pages.
  "form-action 'self' https:",
  "object-src 'none'",
  ...(isHttpsSite ? ['upgrade-insecure-requests'] : []),
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Listing photos are resized and re-encoded to WebP at upload time (sharp), so no second pass is needed.
    unoptimized: true,
  },
  // The content-page fallback reads the seed migration at runtime.
  outputFileTracingIncludes: {
    '/[page]': ['./supabase/migrations/20261010001000_content_pages.sql'],
    '/yardim': ['./supabase/migrations/20261010001000_content_pages.sql'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

export default nextConfig
