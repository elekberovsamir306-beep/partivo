import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetRequestForm } from '../auth-forms'

export const metadata: Metadata = { title: 'Şifrənin bərpası', robots: { index: false } }

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Şifrənin bərpası</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">E-poçtunuzu daxil edin, şifrəni yeniləmək üçün link göndərək.</p>
      <ResetRequestForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/giris" className="font-semibold text-accent-text hover:underline">
          Girişə qayıt
        </Link>
      </p>
    </>
  )
}
