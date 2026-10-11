/**
 * Grants the super_admin role to an EXISTING, email-verified user. Works only while no super admin exists.
 * Usage: npm run admin:create -- owner@partivo.az
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (.env.local).
 * No password is created or stored here: register normally on the site first, then run this script.
 */
import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !email.includes('@')) {
  console.error('Usage: npm run admin:create -- <email>')
  process.exit(1)
}
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await supabase.rpc('bootstrap_super_admin', { p_email: email })
if (error) {
  const hints: Record<string, string> = {
    super_admin_exists: 'A super admin already exists. Grant further roles from /admin/heyet.',
    user_not_found: 'No user with that email. Register on the site and confirm the email first.',
  }
  console.error(`Failed: ${error.message}${hints[error.message] ? `\n${hints[error.message]}` : ''}`)
  process.exit(1)
}
console.log(`✓ ${email} (${data}) is now super admin. Sign in and open /admin.`)
