import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/hesab', '/admin', '/api/', '/giris', '/qeydiyyat', '/sifre-berpa', '/sifre-yenile', '/secilmisler', '/elan-yerlesdir', '/odenis', '/auth'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}
