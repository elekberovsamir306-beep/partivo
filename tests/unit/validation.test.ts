import { describe, expect, it } from 'vitest'
import { listingDraftSchema, listingPublishSchema } from '@/lib/validation/listing'
import { registerSchema, supportSchema } from '@/lib/validation/forms'

const complete = {
  title: 'Toyota Camry 70 ön fara',
  description: 'Original, işlənmiş, heç bir qırığı yoxdur. Quraşdırmaya hazırdır.',
  price: '250',
  is_negotiable: false,
  category_id: '5',
  condition: 'used',
  city_slug: 'baki',
  contact_method: 'both',
  contact_phone: '050 123 45 67',
  delivery_available: false,
  pickup_available: true,
}

describe('listing validation', () => {
  it('accepts a complete listing and normalizes values', () => {
    const r = listingPublishSchema.parse(complete)
    expect(r.price).toBe(250)
    expect(r.category_id).toBe(5)
    expect(r.contact_phone).toBe('+994501234567')
    expect(r.make_id).toBeNull()
  })

  it('allows incomplete drafts but not invalid values', () => {
    expect(listingDraftSchema.safeParse({ title: 'Fa', description: '' }).success).toBe(true)
    expect(listingDraftSchema.safeParse({ title: 'Fara', description: '', price: '-3' }).success).toBe(false)
  })

  it('requires the publish fields', () => {
    const r = listingPublishSchema.safeParse({ ...complete, title: 'Fa', price: '', city_slug: '' })
    expect(r.success).toBe(false)
    const paths = r.error!.issues.map((i) => i.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['title', 'price', 'city_slug']))
  })

  it('rejects landline numbers for WhatsApp contact', () => {
    const r = listingPublishSchema.safeParse({ ...complete, contact_phone: '012 555 12 34', contact_method: 'whatsapp' })
    expect(r.success).toBe(false)
    expect(listingPublishSchema.safeParse({ ...complete, contact_phone: '012 555 12 34', contact_method: 'phone' }).success).toBe(true)
  })

  it('validates year ranges and OEM characters', () => {
    expect(listingDraftSchema.safeParse({ ...complete, year_from: '2020', year_to: '2015' }).success).toBe(false)
    expect(listingDraftSchema.safeParse({ ...complete, oem_code: '04465-33450' }).success).toBe(true)
    expect(listingDraftSchema.safeParse({ ...complete, oem_code: '<script>' }).success).toBe(false)
  })

  it('strips control characters from text', () => {
    const r = listingDraftSchema.parse({ ...complete, title: 'Fara\u0000\u0007 sol' })
    expect(r.title).toBe('Fara sol')
  })
})

describe('form validation', () => {
  it('enforces password strength and confirmation', () => {
    const base = { display_name: 'Samir', email: 'a@b.az', accept_terms: 'on' }
    expect(registerSchema.safeParse({ ...base, password: 'short1', password_confirm: 'short1' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: 'longpassword', password_confirm: 'longpassword' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: 'Parol2026', password_confirm: 'Parol2027' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...base, password: 'Parol2026', password_confirm: 'Parol2026' }).success).toBe(true)
  })

  it('rejects the honeypot field when filled', () => {
    const msg = { name: 'Ali', email: 'ali@example.az', topic: 'general', subject: 'Sual', message: 'Salam, bir sualım var.' }
    expect(supportSchema.safeParse(msg).success).toBe(true)
    expect(supportSchema.safeParse({ ...msg, website: 'http://spam' }).success).toBe(false)
  })
})
