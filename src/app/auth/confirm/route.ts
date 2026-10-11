import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const TYPES: EmailOtpType[] = ['signup', 'email', 'recovery', 'invite', 'email_change', 'magiclink']

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/hesab'
}

/**
 * Email link handler. Supports both the token_hash flow (recommended email templates, works across
 * devices/browsers) and the PKCE ?code= flow (default Supabase templates, same browser only).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeNext(searchParams.get('next'))
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const supabase = await createClient()

  if (tokenHash && type && TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      const destination = type === 'recovery' ? '/sifre-yenile' : next
      return NextResponse.redirect(new URL(destination, origin))
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  return NextResponse.redirect(new URL('/giris?error=link', origin))
}
