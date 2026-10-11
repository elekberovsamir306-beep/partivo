// Captures screenshots of key pages. Usage: node scripts/screenshots.mjs <outDir> [baseUrl]
import { chromium } from '@playwright/test'

const out = process.argv[2] ?? 'screenshots'
const base = process.argv[3] ?? 'http://localhost:3000'
const pages = ['/', '/elanlar', '/reklam', '/yardim', '/giris', '/haqqimizda']
const browser = await chromium.launch()
const errors = []
for (const [name, viewport, scheme] of [
  ['desktop', { width: 1440, height: 900 }, 'dark'],
  ['light', { width: 1440, height: 900 }, 'light'],
  ['mobile', { width: 390, height: 844 }, 'dark'],
]) {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: 'no-preference' })
  const page = await ctx.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`${name} ${page.url()}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${name} ${page.url()}: ${e.message}`))
  for (const p of name === 'light' ? ['/'] : pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${out}/${name}${p === '/' ? '-home' : p.replace(/\//g, '-')}.png`, fullPage: p !== '/' || name === 'mobile' })
  }
  await ctx.close()
}
await browser.close()
console.log(errors.length ? errors.join('\n') : 'no console errors')
