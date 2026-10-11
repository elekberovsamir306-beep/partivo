import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Alert } from '@/components/ui/alert'
import { getSessionUser } from '@/lib/auth'
import { LoginForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Daxil ol', robots: { index: false } }

export default async function LoginPage({ searchParams }: PageProps<'/giris'>) {
  const params = await searchParams
  const next = typeof params.next === 'string' && params.next.startsWith('/') && !params.next.startsWith('//') ? params.next : undefined
  if (await getSessionUser()) redirect(next ?? '/hesab')
  return (
    <>
      <h1 className="text-2xl font-extrabold">Hesabınıza daxil olun</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">Elan yerləşdirmək, seçilmişləri saxlamaq və satıcılarla əlaqə üçün.</p>
      {params.error === 'link' ? (
        <div className="mb-4">
          <Alert tone="warning">Təsdiq linki etibarsızdır və ya müddəti bitib. Yenidən cəhd edin.</Alert>
        </div>
      ) : null}
      {params.confirmed === '1' ? (
        <div className="mb-4">
          <Alert tone="success">E-poçt ünvanınız təsdiqləndi. İndi daxil ola bilərsiniz.</Alert>
        </div>
      ) : null}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted">
        Hesabınız yoxdur?{' '}
        <Link href="/qeydiyyat" className="font-semibold text-accent-text hover:underline">
          Qeydiyyatdan keçin
        </Link>
      </p>
    </>
  )
}
