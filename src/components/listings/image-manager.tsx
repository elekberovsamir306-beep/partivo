'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DragIcon, RefreshIcon, StarIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { deleteImageAction, reorderImagesAction } from '@/app/hesab/elanlar/actions'

export interface ManagedImage {
  id: string
  thumbUrl: string
  url: string
}

interface UploadJob {
  key: string
  name: string
  progress: number
  error?: string
  preview: string
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'
const MAX_EDGE = 2560
const TARGET_BYTES = 3.5 * 1024 * 1024

/** Downscale large photos in the browser so uploads stay fast and under the server body limit. */
async function prepare(file: File): Promise<Blob> {
  if (file.size <= TARGET_BYTES && file.type !== 'image/heic' && file.type !== 'image/heif') {
    try {
      const bitmap = await createImageBitmap(file)
      const ok = Math.max(bitmap.width, bitmap.height) <= MAX_EDGE
      bitmap.close()
      if (ok) return file
    } catch {
      return file // let the server decide (it validates the real content)
    }
  }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Bu şəkil formatı brauzeriniz tərəfindən oxunmur. JPG və ya PNG yükləyin.')
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  for (const quality of [0.9, 0.82, 0.72]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (blob && blob.size <= TARGET_BYTES) return blob
  }
  throw new Error('Şəkil çox böyükdür.')
}

function upload(listingId: string, blob: Blob, name: string, onProgress: (p: number) => void, replace?: string) {
  return new Promise<ManagedImage>((resolve, reject) => {
    const body = new FormData()
    body.append('file', blob, name)
    if (replace) body.append('replace', replace)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/listings/${listingId}/images`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onerror = () => reject(new Error('Şəbəkə xətası. İnternet bağlantınızı yoxlayın.'))
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as { ok: boolean; message?: string; image?: { id: string; url: string; thumbUrl: string } }
        if (xhr.status >= 200 && xhr.status < 300 && json.ok && json.image) resolve(json.image)
        else reject(new Error(json.message ?? 'Yükləmə alınmadı.'))
      } catch {
        reject(new Error('Yükləmə alınmadı.'))
      }
    }
    xhr.send(body)
  })
}

function SortableTile({
  image,
  index,
  onRemove,
  onCover,
  onReplace,
  busy,
}: {
  image: ManagedImage
  index: number
  onRemove: () => void
  onCover: () => void
  onReplace: () => void
  busy: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative aspect-[4/3] overflow-hidden rounded-xl border bg-surface-2 ${index === 0 ? 'border-accent' : 'border-line'} ${isDragging ? 'z-10 opacity-80 shadow-float' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- already-optimised storage thumbnail */}
      <img src={image.thumbUrl} alt={`Şəkil ${index + 1}`} className="h-full w-full object-cover" draggable={false} />
      {index === 0 ? (
        <span className="absolute top-2 left-2 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-ink">Əsas şəkil</span>
      ) : null}
      <button
        type="button"
        className="absolute top-2 right-2 grid size-8 cursor-grab touch-none place-items-center rounded-lg bg-[rgb(11_12_14/0.65)] text-white active:cursor-grabbing"
        aria-label={`Şəkil ${index + 1}: sürüşdürərək yerini dəyişin (klaviatura: boşluq, sonra oxlar)`}
        {...attributes}
        {...listeners}
      >
        <DragIcon size={16} />
      </button>
      <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6">
        {index !== 0 ? (
          <button type="button" disabled={busy} onClick={onCover} className="flex h-8 items-center gap-1 rounded-lg bg-white/15 px-2 text-xs font-semibold text-white backdrop-blur hover:bg-white/25">
            <StarIcon size={13} /> Əsas et
          </button>
        ) : null}
        <button type="button" disabled={busy} onClick={onReplace} className="ml-auto grid size-8 place-items-center rounded-lg bg-white/15 text-white backdrop-blur hover:bg-white/25" aria-label={`Şəkil ${index + 1}: dəyiş`}>
          <RefreshIcon size={15} />
        </button>
        <button type="button" disabled={busy} onClick={onRemove} className="grid size-8 place-items-center rounded-lg bg-white/15 text-white backdrop-blur hover:bg-danger" aria-label={`Şəkil ${index + 1}: sil`}>
          <TrashIcon size={15} />
        </button>
      </div>
    </li>
  )
}

export function ImageManager({
  listingId,
  initial,
  minPhotos,
  maxPhotos,
  onChange,
}: {
  listingId: string
  initial: ManagedImage[]
  minPhotos: number
  maxPhotos: number
  onChange?: (count: number) => void
}) {
  const [images, setImages] = useState(initial)
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    onChange?.(images.length)
  }, [images.length, onChange])

  const remaining = maxPhotos - images.length - jobs.filter((j) => !j.error).length

  async function addFiles(files: FileList | File[]) {
    setError(null)
    const list = Array.from(files)
    if (list.length > remaining) setError(`Ən çox ${maxPhotos} şəkil. Yalnız ilk ${Math.max(remaining, 0)} şəkil əlavə olunacaq.`)
    for (const file of list.slice(0, Math.max(remaining, 0))) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`
      const preview = URL.createObjectURL(file)
      setJobs((j) => [...j, { key, name: file.name, progress: 0, preview }])
      try {
        const blob = await prepare(file)
        const image = await upload(listingId, blob, file.name.replace(/\.\w+$/, '.jpg'), (progress) =>
          setJobs((j) => j.map((x) => (x.key === key ? { ...x, progress } : x))),
        )
        setImages((prev) => [...prev, image])
        setJobs((j) => j.filter((x) => x.key !== key))
        URL.revokeObjectURL(preview)
      } catch (e) {
        setJobs((j) => j.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)))
      }
    }
  }

  async function replaceFile(file: File) {
    const target = replaceTarget.current
    if (!target) return
    setError(null)
    try {
      const blob = await prepare(file)
      const image = await upload(listingId, blob, file.name, () => {}, target)
      setImages((prev) => prev.map((i) => (i.id === target ? image : i)))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function persistOrder(next: ManagedImage[]) {
    setImages(next)
    startTransition(async () => {
      const result = await reorderImagesAction(listingId, next.map((i) => i.id))
      if (!result.ok) setError(result.message ?? 'Sıralama yadda saxlanmadı.')
    })
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = images.findIndex((i) => i.id === active.id)
    const to = images.findIndex((i) => i.id === over.id)
    persistOrder(arrayMove(images, from, to))
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteImageAction(id)
      if (result.ok) setImages((prev) => prev.filter((i) => i.id !== id))
      else setError(result.message ?? 'Silinmədi.')
    })
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files)
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${dragOver ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface-2/40'}`}
      >
        <UploadIcon size={28} className="mx-auto text-accent-text" />
        <p className="mt-2 text-sm font-semibold">Şəkilləri bura sürüşdürün və ya seçin</p>
        <p className="mt-1 text-xs text-subtle">
          JPG, PNG, WEBP · ən azı {minPhotos}, ən çox {maxPhotos} şəkil · birinci şəkil elanın əsas şəkli olur
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={remaining <= 0}
          className="mt-4 h-10 rounded-xl bg-fg px-5 text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Şəkil seç
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={replaceRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void replaceFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <p className="mt-3 text-sm" aria-live="polite">
        <span className={images.length >= minPhotos ? 'font-semibold text-success' : 'font-semibold text-warning'}>
          {images.length} / {maxPhotos}
        </span>{' '}
        <span className="text-muted">
          {images.length >= minPhotos ? 'şəkil yükləndi' : `şəkil — dərc etmək üçün ən azı ${minPhotos} lazımdır`}
        </span>
      </p>
      {error ? <p role="alert" className="mt-2 text-sm text-danger">{error}</p> : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {images.map((image, index) => (
              <SortableTile
                key={image.id}
                image={image}
                index={index}
                busy={pending}
                onRemove={() => remove(image.id)}
                onCover={() => persistOrder([image, ...images.filter((i) => i.id !== image.id)])}
                onReplace={() => {
                  replaceTarget.current = image.id
                  replaceRef.current?.click()
                }}
              />
            ))}
            {jobs.map((job) => (
              <li key={job.key} className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL) */}
                <img src={job.preview} alt="" className="h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
                  {job.error ? (
                    <>
                      <p className="text-xs font-semibold text-danger">{job.error}</p>
                      <button type="button" onClick={() => setJobs((j) => j.filter((x) => x.key !== job.key))} className="text-xs underline">
                        Bağla
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 w-3/4 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${job.name} yüklənir`}>
                        <div className="h-full bg-accent transition-[width]" style={{ width: `${job.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{job.progress}%</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
