import { z } from 'zod'
import { normalizeAzPhone } from '@/lib/phone'

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Düzgün e-poçt ünvanı daxil edin').max(254))

export const passwordSchema = z
  .string()
  .min(8, 'Şifrə ən azı 8 simvol olmalıdır')
  .max(72, 'Şifrə ən çox 72 simvol ola bilər')
  .refine((p) => /[A-Za-zƏəĞğİıÖöÜüŞşÇç]/.test(p) && /\d/.test(p), 'Şifrədə həm hərf, həm rəqəm olmalıdır')

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifrəni daxil edin').max(72),
  next: z.string().optional(),
})

export const registerSchema = z
  .object({
    display_name: z.string().trim().min(2, 'Adınızı daxil edin').max(80),
    email: emailSchema,
    password: passwordSchema,
    password_confirm: z.string(),
    accept_terms: z.literal('on', { message: 'İstifadə şərtlərini qəbul etməlisiniz' }),
  })
  .refine((v) => v.password === v.password_confirm, { path: ['password_confirm'], message: 'Şifrələr eyni deyil' })

export const resetRequestSchema = z.object({ email: emailSchema })

export const newPasswordSchema = z
  .object({ password: passwordSchema, password_confirm: z.string() })
  .refine((v) => v.password === v.password_confirm, { path: ['password_confirm'], message: 'Şifrələr eyni deyil' })

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Ən çox ${max} simvol`)
    .transform((v) => v || null)
    .nullable()
    .optional()
    .transform((v) => v ?? null)

export const profileSchema = z
  .object({
    display_name: z.string().trim().min(2, 'Ən azı 2 simvol').max(80),
    seller_type: z.enum(['private', 'business']),
    business_name: optionalTrimmed(120),
    business_description: optionalTrimmed(1500),
    business_address: optionalTrimmed(200),
    city_slug: z
      .string()
      .regex(/^[a-z0-9-]*$/)
      .transform((v) => v || null)
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .refine((v) => v.seller_type === 'private' || (v.business_name && v.business_name.length >= 2), {
    path: ['business_name'],
    message: 'Biznes adı daxil edin',
  })

export const contactSettingsSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null
      const n = normalizeAzPhone(v)
      if (!n) {
        ctx.addIssue({ code: 'custom', message: 'Düzgün Azərbaycan nömrəsi daxil edin' })
        return z.NEVER
      }
      return n
    }),
  default_contact_method: z.enum(['phone', 'whatsapp', 'both']),
  email_notifications: z.boolean(),
})

export const reportSchema = z.object({
  listing_id: z.uuid(),
  reason: z.enum(['fraud', 'prohibited', 'duplicate', 'wrong_category', 'wrong_price', 'already_sold', 'offensive', 'other']),
  details: z
    .string()
    .trim()
    .max(1000, 'Ən çox 1000 simvol')
    .transform((v) => v || null),
})

export const supportSchema = z.object({
  name: z.string().trim().min(2, 'Adınızı daxil edin').max(80),
  email: emailSchema,
  topic: z.enum(['general', 'account', 'listing', 'payment', 'report', 'business', 'other']),
  subject: z.string().trim().min(3, 'Mövzunu daxil edin').max(160),
  message: z.string().trim().min(10, 'Mesaj ən azı 10 simvol olmalıdır').max(4000),
  // Honeypot: real users never fill this hidden field.
  website: z.string().max(0).optional().or(z.literal('')),
})

export const promotionCheckoutSchema = z.object({
  listing_id: z.uuid(),
  package_id: z.coerce.number().int().positive(),
})
