'use client'

import { useEffect } from 'react'
import { Button, ButtonLink } from '@/components/ui/button'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <h1 className="text-2xl font-extrabold">Gözlənilməz xəta baş verdi</h1>
      <p className="mt-2 max-w-md text-muted">Bir az sonra yenidən cəhd edin. Problem davam edərsə, bizimlə əlaqə saxlayın.</p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-subtle">Kod: {error.digest}</p> : null}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Yenidən cəhd et</Button>
        <ButtonLink href="/" variant="outline">Ana səhifə</ButtonLink>
      </div>
    </div>
  )
}
