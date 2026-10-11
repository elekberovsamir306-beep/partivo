'use client'

import Link from 'next/link'
import { useActionState, useRef, useState } from 'react'
import { CheckIcon, FlagIcon, ShareIcon, XIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { reportListingAction } from '@/app/actions/public'
import { t } from '@/i18n'

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user cancelled or share unavailable: fall back to copying
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"
    >
      {copied ? <CheckIcon size={18} className="text-success" /> : <ShareIcon size={18} />}
      {copied ? 'Link kopyalandı' : 'Paylaş'}
    </button>
  )
}

export function ReportButton({ listingId, signedIn, loginHref }: { listingId: string; signedIn: boolean; loginHref: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, action, pending] = useActionState(reportListingAction, {})

  if (!signedIn) {
    return (
      <Link href={loginHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger">
        <FlagIcon size={16} />
        Şikayət et
      </Link>
    )
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger">
        <FlagIcon size={16} />
        Şikayət et
      </button>
      <dialog ref={dialogRef} aria-labelledby="report-title" className="m-auto w-[min(32rem,92vw)] rounded-2xl border border-line bg-elevated p-0 text-fg shadow-float">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="report-title" className="text-lg font-bold">Elan barədə şikayət</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2" aria-label={t.nav.close}>
            <XIcon size={18} />
          </button>
        </div>
        {state.ok ? (
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted">{state.message}</p>
            <Button type="button" variant="secondary" onClick={() => dialogRef.current?.close()}>{t.nav.close}</Button>
          </div>
        ) : (
          <form action={action} className="space-y-4 p-5">
            <input type="hidden" name="listing_id" value={listingId} />
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Səbəb</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(t.reportReasons).map(([value, label], i) => (
                  <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                    <input type="radio" name="reason" value={value} defaultChecked={i === 0} className="accent-[var(--accent)]" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="report-details" className="mb-1.5 block text-sm font-medium">
                Ətraflı <span className="font-normal text-subtle">(istəyə bağlı)</span>
              </label>
              <textarea id="report-details" name="details" maxLength={1000} className="field min-h-24" placeholder="Nəyi aşkar etdiniz?" />
            </div>
            {state.message ? <p role="alert" className="text-sm text-danger">{state.message}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>{t.common.cancel}</Button>
              <Button type="submit" variant="danger" loading={pending}>Göndər</Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}
