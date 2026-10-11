import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { ShieldCheckIcon } from '@/components/icons'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getCities } from '@/lib/data/catalog'
import { publicEnv } from '@/lib/env'
import { formatAzPhone } from '@/lib/phone'
import { avatarUrl } from '@/lib/storage'
import { AvatarForm, ContactSettingsForm, PhoneVerificationForm, ProfileForm, type ProfileValues } from './forms'

export const metadata: Metadata = { title: 'Profil', robots: { index: false } }

export default async function ProfilePage() {
  const user = await requireUser('/hesab/profil')
  const supabase = await createClient()
  const [{ data: profile }, { data: priv }, cities] = await Promise.all([
    supabase.from('profiles').select('display_name, seller_type, business_name, business_description, business_address, city_slug, avatar_path, is_verified').eq('id', user.id).single(),
    supabase.from('profile_private').select('phone, phone_verified_at, default_contact_method, email_notifications').eq('id', user.id).single(),
    getCities(),
  ])
  const p = profile as ProfileValues & { avatar_path: string | null; is_verified: boolean }
  const pr = priv as { phone: string | null; phone_verified_at: string | null; default_contact_method: 'phone' | 'whatsapp' | 'both'; email_notifications: boolean }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">Profil və əlaqə</h1>
        {p.is_verified ? (
          <Badge tone="success"><ShieldCheckIcon size={13} />Təsdiqlənmiş satıcı</Badge>
        ) : null}
      </div>

      <section className="card space-y-6 p-5 sm:p-7">
        <h2 className="text-lg font-bold">Profil</h2>
        <AvatarForm avatar={avatarUrl(p.avatar_path)} />
        <ProfileForm profile={p} cities={cities.map(({ slug, name }) => ({ slug, name }))} />
      </section>

      <section className="card space-y-6 p-5 sm:p-7">
        <h2 className="text-lg font-bold">Əlaqə ayarları</h2>
        <ContactSettingsForm values={pr} />
      </section>

      <section className="card space-y-4 p-5 sm:p-7">
        <h2 className="text-lg font-bold">Telefonun təsdiqi</h2>
        {pr.phone && pr.phone_verified_at ? (
          <p className="text-sm text-success">{formatAzPhone(pr.phone)} nömrəsi təsdiqlənib.</p>
        ) : publicEnv.phoneVerificationEnabled ? (
          <PhoneVerificationForm phone={pr.phone} />
        ) : (
          <p className="text-sm text-muted">SMS ilə telefon təsdiqi tezliklə aktiv olacaq.</p>
        )}
      </section>
    </div>
  )
}
