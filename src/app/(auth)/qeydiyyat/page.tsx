import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { RegisterForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Qeydiyyat', robots: { index: false } }

export default async function RegisterPage() {
  if (await getSessionUser()) redirect('/hesab')
  return (
    <>
      <h1 className="text-2xl font-extrabold">Pulsuz hesab yaradın</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">Bir dəqiqəyə qeydiyyatdan keçin və ilk elanınızı yerləşdirin.</p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        Artıq hesabınız var?{' '}
        <Link href="/giris" className="font-semibold text-accent-text hover:underline">
          Daxil olun
        </Link>
      </p>
    </>
  )
}
