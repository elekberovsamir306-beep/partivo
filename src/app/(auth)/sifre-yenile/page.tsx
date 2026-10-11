import type { Metadata } from 'next'
import Link from 'next/link'
import { Alert } from '@/components/ui/alert'
import { getSessionUser } from '@/lib/auth'
import { NewPasswordForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Yeni şifrə', robots: { index: false } }

/** Reached from the recovery email link via /auth/confirm, which establishes a short-lived session. */
export default async function NewPasswordPage() {
  const user = await getSessionUser()
  return (
    <>
      <h1 className="text-2xl font-extrabold">Yeni şifrə təyin edin</h1>
      {user ? (
        <>
          <p className="mt-1.5 mb-6 text-sm text-muted">{user.email} hesabı üçün yeni şifrə daxil edin.</p>
          <NewPasswordForm />
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <Alert tone="warning">Bərpa linki etibarsızdır və ya müddəti bitib.</Alert>
          <Link href="/sifre-berpa" className="text-sm font-semibold text-accent-text hover:underline">
            Yeni link tələb et
          </Link>
        </div>
      )}
    </>
  )
}
