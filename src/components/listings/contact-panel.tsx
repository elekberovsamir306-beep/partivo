'use client'

import { useState, useTransition } from 'react'
import { ChatIcon, PhoneIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { revealContactAction } from '@/app/actions/public'
import { formatAzPhone, telHref, whatsappHref } from '@/lib/phone'

/**
 * The phone number is fetched on demand (rate-limited server action) so it never appears in page HTML.
 * WhatsApp opens wa.me with a URL-encoded message containing the listing title and link.
 */
export function ContactPanel({
  listingId,
  listingTitle,
  listingUrl,
  contactMethod,
}: {
  listingId: string
  listingTitle: string
  listingUrl: string
  contactMethod: 'phone' | 'whatsapp' | 'both'
}) {
  const [pending, startTransition] = useTransition()
  const [contact, setContact] = useState<{ phone: string; call: boolean; whatsapp: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function reveal(then?: (c: { phone: string; whatsapp: boolean }) => void) {
    startTransition(async () => {
      setError(null)
      const result = await revealContactAction(listingId)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setContact(result)
      then?.(result)
    })
  }

  const message = `Salam! Partivo-dakı "${listingTitle}" elanı ilə maraqlanıram.\n${listingUrl}`
  const openWhatsApp = (c: { phone: string; whatsapp: boolean }) => {
    const href = c.whatsapp ? whatsappHref(c.phone, message) : null
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
    else setError('Satıcının WhatsApp nömrəsi mövcud deyil.')
  }

  return (
    <div className="space-y-2.5">
      {contactMethod !== 'whatsapp' ? (
        contact?.call ? (
          <a
            href={telHref(contact.phone)}
            className="flex h-13 w-full items-center justify-center gap-2.5 rounded-xl bg-accent text-base font-bold text-accent-ink tabular-nums transition-colors hover:bg-accent-hover"
          >
            <PhoneIcon size={19} />
            {formatAzPhone(contact.phone)}
          </a>
        ) : (
          <Button size="lg" className="w-full" onClick={() => reveal()} loading={pending && !contact}>
            <PhoneIcon size={19} />
            Nömrəni göstər
          </Button>
        )
      ) : null}
      {contactMethod !== 'phone' ? (
        <Button
          size="lg"
          variant="whatsapp"
          className="w-full"
          disabled={pending}
          onClick={() => (contact ? openWhatsApp(contact) : reveal(openWhatsApp))}
        >
          <ChatIcon size={19} />
          WhatsApp-da yaz
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p className="pt-1 text-xs leading-relaxed text-subtle">
        Təhlükəsizlik: heç vaxt qabaqcadan ödəniş etməyin və kart məlumatlarınızı paylaşmayın. Hissəni şəxsən yoxlayın.
      </p>
    </div>
  )
}
