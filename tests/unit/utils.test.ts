import { describe, expect, it } from 'vitest'
import { formatAzPhone, isMobileAzPhone, normalizeAzPhone, whatsappHref } from '@/lib/phone'
import { foldAz, listingPath, parseListingParam, slugify } from '@/lib/text'
import { formatDate, formatPrice } from '@/lib/format'
import { buildSearchQuery, parseSearchParams } from '@/lib/search-params'

describe('phone', () => {
  it.each([
    ['050 123 45 67', '+994501234567'],
    ['+994 55 123-45-67', '+994551234567'],
    ['994701234567', '+994701234567'],
    ['00994991234567', '+994991234567'],
    ['501234567', '+994501234567'],
    ['(012) 555 12 34', '+994125551234'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeAzPhone(input)).toBe(expected)
  })

  it.each(['12345', '+1 202 555 0100', '094 123 45 67', 'abc', ''])('rejects %s', (input) => {
    expect(normalizeAzPhone(input)).toBeNull()
  })

  it('distinguishes mobile from landline for WhatsApp', () => {
    expect(isMobileAzPhone('+994501234567')).toBe(true)
    expect(isMobileAzPhone('+994125551234')).toBe(false)
    expect(whatsappHref('+994125551234', 'x')).toBeNull()
  })

  it('builds an encoded wa.me link', () => {
    const href = whatsappHref('+994501234567', 'Salam! "Fara" elanı\nhttps://partivo.az/elan/100001-fara')
    expect(href).toBe(
      'https://wa.me/994501234567?text=' + encodeURIComponent('Salam! "Fara" elanı\nhttps://partivo.az/elan/100001-fara'),
    )
  })

  it('formats for display', () => {
    expect(formatAzPhone('+994501234567')).toBe('+994 50 123 45 67')
  })
})

describe('text', () => {
  it('folds Azerbaijani letters like the database az_fold()', () => {
    expect(foldAz('Əyləc Şüşə Çıraq Ğ İ ı Ö Ü')).toBe('eylec suse ciraq g i i o u')
  })
  it('slugifies titles', () => {
    expect(slugify('Toyota Camry 70 — ön sol fara (original)')).toBe('toyota-camry-70-on-sol-fara-original')
    expect(slugify('!!!')).toBe('elan')
  })
  it('round-trips listing URLs', () => {
    const path = listingPath({ ref_no: 100245, slug: 'bmw-e60-fara' })
    expect(path).toBe('/elan/100245-bmw-e60-fara')
    expect(parseListingParam('100245-bmw-e60-fara')).toBe(100245)
    expect(parseListingParam('abc')).toBeNull()
  })
})

describe('format', () => {
  it('formats AZN prices', () => {
    expect(formatPrice(1250)).toBe('1 250 ₼')
    expect(formatPrice('19.5')).toBe('19,5 ₼')
    expect(formatPrice(null)).toBe('Razılaşma ilə')
  })
  it('formats dates in Baku time with Azerbaijani month names', () => {
    expect(formatDate('2026-10-09T21:30:00Z')).toBe('10 oktyabr 2026')
  })
})

describe('search params', () => {
  it('parses and sanitizes filters', () => {
    const f = parseSearchParams({
      q: '  fara ',
      category: 'optika',
      make: 'BAD SLUG!',
      price_min: '10',
      price_max: '-5',
      condition: 'new,used,bogus',
      page: '3',
      sort: 'price_asc',
      delivery: '1',
    })
    expect(f.q).toBe('fara')
    expect(f.category).toBe('optika')
    expect(f.make).toBeNull()
    expect(f.priceMin).toBe(10)
    expect(f.priceMax).toBeNull()
    expect(f.conditions).toEqual(['new', 'used'])
    expect(f.page).toBe(3)
    expect(f.sort).toBe('price_asc')
    expect(f.delivery).toBe(true)
  })

  it('defaults sort to newest without a keyword and relevance with one', () => {
    expect(parseSearchParams({}).sort).toBe('newest')
    expect(parseSearchParams({ q: 'fara' }).sort).toBe('relevance')
  })

  it('round-trips through the URL', () => {
    const f = parseSearchParams({ q: 'amortizator', make: 'toyota', model: 'camry', condition: 'used', city: 'baki', page: '2' })
    expect(parseSearchParams(new URLSearchParams(buildSearchQuery(f)))).toEqual(f)
  })
})
