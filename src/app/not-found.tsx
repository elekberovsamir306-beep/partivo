import { ButtonLink } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-display text-8xl font-extrabold text-metal">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">Səhifə tapılmadı</h1>
      <p className="mt-2 max-w-md text-muted">Elan satılmış, silinmiş və ya link səhv yazılmış ola bilər.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/elanlar">Elanlara bax</ButtonLink>
        <ButtonLink href="/" variant="outline">Ana səhifə</ButtonLink>
      </div>
    </div>
  )
}
