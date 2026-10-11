import { z } from 'zod'
import { isMobileAzPhone, normalizeAzPhone } from '@/lib/phone'

// Removes ASCII control characters (except newlines/tabs) that have no place in user text.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()

const text = (max: number) => z.string().max(max * 2).transform(clean).pipe(z.string().max(max, `Ən çox ${max} simvol`))
// Optional fields use z.preprocess so that a missing key, "" and null all become null (Zod 4 treats
// transform/pipe chains as required keys otherwise).
const toNumber = (v: unknown) => (v === "" || v == null ? null : typeof v === "number" ? v : Number(String(v).replace(",", ".")))

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (v == null ? null : typeof v === "string" ? clean(v) || null : v),
    z.string().max(max, `Ən çox ${max} simvol`).nullable(),
  )

const optionalInt = (min: number, max: number) =>
  z.preprocess(toNumber, z.number("Rəqəm daxil edin").int("Tam ədəd daxil edin").min(min).max(max).nullable())

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v ? v : null), z.enum(values).nullable())

const currentYear = new Date().getFullYear()

export const CONDITIONS = ['new', 'used', 'refurbished'] as const
export const ENGINE_TYPES = ['petrol', 'diesel', 'hybrid', 'electric', 'gas', 'other'] as const
export const ORIGINALITY = ['original', 'aftermarket'] as const
export const CONTACT_METHODS = ['phone', 'whatsapp', 'both'] as const

const baseShape = {
  title: text(90),
  description: text(5000),
  price: z.preprocess(
    toNumber,
      z
        .number('Qiyməti rəqəmlə yazın')
        .min(0, 'Qiymət mənfi ola bilməz')
        .max(10_000_000, 'Qiymət çox böyükdür')
        .refine((n) => Math.round(n * 100) === n * 100, 'Ən çox 2 onluq rəqəm')
        .nullable(),
  ),
  is_negotiable: z.boolean().default(false),
  category_id: optionalInt(1, Number.MAX_SAFE_INTEGER),
  condition: optionalEnum(CONDITIONS),
  city_slug: z.preprocess((v) => v || null, z.string().regex(/^[a-z0-9-]{2,40}$/, 'Şəhəri seçin').nullable()),
  make_id: optionalInt(1, Number.MAX_SAFE_INTEGER),
  model_id: optionalInt(1, Number.MAX_SAFE_INTEGER),
  year_from: optionalInt(1950, currentYear + 1),
  year_to: optionalInt(1950, currentYear + 1),
  engine_type: optionalEnum(ENGINE_TYPES),
  engine_volume: z.preprocess(toNumber, z.number().min(0.5, 'Ən azı 0.5 l').max(10, 'Ən çox 10 l').nullable()),
  oem_code: optionalText(60).refine((v) => v == null || /^[A-Za-z0-9 .\-/]+$/.test(v), 'OEM kodunda yalnız hərf, rəqəm, boşluq, "-", "." və "/" ola bilər'),
  manufacturer: optionalText(60),
  originality: optionalEnum(ORIGINALITY),
  compatibility_notes: optionalText(1000),
  delivery_available: z.boolean().default(false),
  pickup_available: z.boolean().default(true),
  delivery_notes: optionalText(300),
  warranty_months: optionalInt(0, 120),
  warranty_notes: optionalText(300),
  contact_method: z.enum(CONTACT_METHODS).default('both'),
  contact_phone: z
    .preprocess((v) => (typeof v === 'string' ? v : null), z.string().nullable())
    .transform((v, ctx) => {
      if (!v || !v.trim()) return null
      const normalized = normalizeAzPhone(v)
      if (!normalized) {
        ctx.addIssue({ code: 'custom', message: 'Düzgün Azərbaycan nömrəsi daxil edin, məsələn 050 123 45 67' })
        return z.NEVER
      }
      return normalized
    }),
}

type Base = z.infer<z.ZodObject<typeof baseShape>>

function crossChecks(v: Base, ctx: z.RefinementCtx) {
  if (v.year_from != null && v.year_to != null && v.year_from > v.year_to) {
    ctx.addIssue({ code: 'custom', path: ['year_to'], message: 'Son il başlanğıc ildən kiçik ola bilməz' })
  }
  if (v.model_id != null && v.make_id == null) {
    ctx.addIssue({ code: 'custom', path: ['make_id'], message: 'Əvvəlcə markanı seçin' })
  }
  if (v.contact_phone && v.contact_method !== 'phone' && !isMobileAzPhone(v.contact_phone)) {
    ctx.addIssue({ code: 'custom', path: ['contact_phone'], message: 'WhatsApp üçün mobil nömrə lazımdır' })
  }
  if (!v.delivery_available && !v.pickup_available) {
    ctx.addIssue({ code: 'custom', path: ['pickup_available'], message: 'Ən azı bir təhvil üsulu seçin' })
  }
}

/** Drafts may be incomplete, but every value present must be valid. */
export const listingDraftSchema = z.object(baseShape).superRefine(crossChecks)

/** Everything required to publish. Enforced again inside public.publish_listing(). */
export const listingPublishSchema = z
  .object(baseShape)
  .superRefine(crossChecks)
  .superRefine((v, ctx) => {
    const req = (ok: boolean, path: string, message: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', path: [path], message })
    }
    req(v.title.length >= 5, 'title', 'Başlıq ən azı 5 simvol olmalıdır')
    req(v.description.length >= 20, 'description', 'Təsvir ən azı 20 simvol olmalıdır')
    req(v.price != null, 'price', 'Qiyməti daxil edin')
    req(v.category_id != null, 'category_id', 'Kateqoriyanı seçin')
    req(v.condition != null, 'condition', 'Vəziyyəti seçin')
    req(v.city_slug != null, 'city_slug', 'Şəhəri seçin')
    req(v.contact_phone != null, 'contact_phone', 'Əlaqə nömrəsini daxil edin')
  })

/** Raw, untrusted form values; always parsed with the schemas above before use. */
export type ListingInput = object
export type ListingDraft = z.output<typeof listingDraftSchema>

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    out[key] ??= issue.message
  }
  return out
}
