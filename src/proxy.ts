import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const PROTECTED = ['/hesab', '/admin', '/elan-yerlesdir', '/secilmisler']
// Endpoints called by third parties (signed separately), exempt from the same-origin check.
const EXTERNAL_POST = ['/api/payments/epoint/callback']

/**
 * - Refreshes the Supabase session cookie.
 * - Optimistic redirect to login for private areas (real authorization happens in pages, actions and RLS).
 * - CSRF defence for route handlers: state-changing API requests must come from our own origin.
 *   (Server Actions already enforce this in Next.js.)
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !EXTERNAL_POST.includes(pathname)) {
    const origin = request.headers.get('origin')
    if (!origin || new URL(origin).host !== request.nextUrl.host) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
  }

  const { response, userId } = await updateSession(request)

  if (!userId && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone()
    url.pathname = '/giris'
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
}
