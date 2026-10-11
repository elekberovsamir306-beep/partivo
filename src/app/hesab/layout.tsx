import { requireUser } from '@/lib/auth'
import { AccountNav } from './account-nav'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/hesab')
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
