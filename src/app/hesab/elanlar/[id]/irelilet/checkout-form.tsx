'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { PackageCard } from '@/components/promotions/package-cards'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import type { PromotionPackage } from '@/lib/types'
import { startCheckoutAction } from './actions'

export function CheckoutForm({ listingId, packages, testMode }: { listingId: string; packages: PromotionPackage[]; testMode: boolean }) {
  const [selected, setSelected] = useState<number | null>(packages[1]?.id ?? packages[0]?.id ?? null)
  const [state, action, pending] = useActionState(startCheckoutAction, {})
  const pkg = packages.find((p) => p.id === selected)

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="listing_id" value={listingId} />
      {testMode ? (
        <Alert tone="warning" title="TEST REJİMİ">
          Ödəniş provayderi test rejimindədir. Heç bir real ödəniş edilməyəcək və bu sifariş real ödəniş kimi qeydə alınmayacaq.
        </Alert>
      ) : null}
      <fieldset>
        <legend className="mb-4 text-lg font-bold">Paket seçin</legend>
        <div className="grid gap-4 md:grid-cols-3">
          {packages.map((p) => (
            <label key={p.id} className="cursor-pointer rounded-3xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
              <input type="radio" name="package_id" value={p.id} checked={selected === p.id} onChange={() => setSelected(p.id)} className="sr-only" />
              <PackageCard pkg={p} featured={selected === p.id} />
            </label>
          ))}
        </div>
      </fieldset>

      {pkg ? (
        <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm text-muted">Sifariş xülasəsi</p>
            <p className="mt-1 font-bold">
              {pkg.name} · {pkg.duration_days} gün
            </p>
            <p className="mt-1 text-xs text-subtle">
              Ödəniş bankın təhlükəsiz səhifəsində aparılır. Kart məlumatları Partivo-da saxlanılmır.{' '}
              <Link href="/odenis-ve-geri-qaytarma" className="underline" target="_blank">Qaydalar</Link>
            </p>
          </div>
          <div className="flex items-center gap-5">
            <p className="font-display text-3xl font-extrabold tabular-nums">{formatPrice(pkg.price)}</p>
            <Button type="submit" size="lg" loading={pending}>
              Ödənişə keç
            </Button>
          </div>
        </div>
      ) : null}
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
    </form>
  )
}
