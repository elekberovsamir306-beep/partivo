'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon, XIcon, ZoomIcon } from '@/components/icons'

export interface GalleryImage {
  id: string
  src: string
  thumb: string
  width: number
  height: number
}

export function Gallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const touchStart = useRef<number | null>(null)
  const count = images.length

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    dialog.addEventListener('keydown', onKey)
    return () => dialog.removeEventListener('keydown', onKey)
  }, [go])

  if (!count) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-line bg-surface-2 text-subtle">
        <ImageIcon size={40} />
      </div>
    )
  }

  const current = images[index]
  const open = () => {
    setZoomed(false)
    dialogRef.current?.showModal()
  }

  return (
    <div>
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface-2"
        onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return
          const dx = e.changedTouches[0].clientX - touchStart.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchStart.current = null
        }}
      >
        <Image
          src={current.src}
          alt={`${title} — şəkil ${index + 1} / ${count}`}
          fill
          unoptimized
          priority={index === 0}
          sizes="(min-width: 1024px) 760px, 100vw"
          className="object-contain"
        />
        <button
          type="button"
          onClick={open}
          className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-[rgb(11_12_14/0.6)] px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
        >
          <ZoomIcon size={15} />
          Böyüt
        </button>
        {count > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Əvvəlki şəkil" className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[rgb(11_12_14/0.6)] text-white backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100">
              <ChevronLeftIcon />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Növbəti şəkil" className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[rgb(11_12_14/0.6)] text-white backdrop-blur-md transition-opacity sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100">
              <ChevronRightIcon />
            </button>
            <span className="absolute bottom-3 left-3 rounded-full bg-[rgb(11_12_14/0.6)] px-2.5 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur-md">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Şəkillər">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Şəkil ${i + 1}`}
                aria-current={i === index}
                className={`relative block h-16 w-20 overflow-hidden rounded-lg border-2 transition-colors ${i === index ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <Image src={img.thumb} alt="" fill unoptimized sizes="80px" className="object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-label="Şəkil qalereyası"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-[#050506] p-0 text-white"
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm tabular-nums">{index + 1} / {count}</span>
            <button type="button" onClick={() => dialogRef.current?.close()} className="grid size-11 place-items-center rounded-full bg-white/10" aria-label="Bağla" autoFocus>
              <XIcon />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <button
              type="button"
              className={`relative block h-full w-full ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              aria-label={zoomed ? 'Kiçilt' : 'Böyüt'}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setOrigin(`${((e.clientX - rect.left) / rect.width) * 100}% ${((e.clientY - rect.top) / rect.height) * 100}%`)
                setZoomed((z) => !z)
              }}
            >
              <Image
                src={current.src}
                alt={`${title} — şəkil ${index + 1}`}
                fill
                unoptimized
                sizes="100vw"
                className="object-contain transition-transform duration-300"
                style={{ transform: zoomed ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
              />
            </button>
            {count > 1 ? (
              <>
                <button type="button" onClick={() => { setZoomed(false); go(-1) }} aria-label="Əvvəlki şəkil" className="absolute top-1/2 left-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                  <ChevronLeftIcon />
                </button>
                <button type="button" onClick={() => { setZoomed(false); go(1) }} aria-label="Növbəti şəkil" className="absolute top-1/2 right-4 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                  <ChevronRightIcon />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </dialog>
    </div>
  )
}
