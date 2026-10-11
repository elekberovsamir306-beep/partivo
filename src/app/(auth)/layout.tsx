import { LogoMark } from '@/components/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="grid-noise pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden="true" />
      <div className="container-page relative flex justify-center py-12 sm:py-20">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <LogoMark size={44} />
          </div>
          <div className="card p-6 shadow-float sm:p-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
