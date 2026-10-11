import { expect, test } from '@playwright/test'

test.describe('buyer journey (public)', () => {
  test('home → search → filters are reflected in the URL', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('hissəni')
    const search = page.getByRole('searchbox').last()
    await search.fill('amortizator')
    await search.press('Enter')
    await expect(page).toHaveURL(/\/elanlar\?q=amortizator/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('amortizator')
  })

  test('legal and help pages render from editable content', async ({ page }) => {
    for (const path of ['/istifade-sertleri', '/mexfilik-siyaseti', '/elan-qaydalari', '/odenis-ve-geri-qaytarma']) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
    await page.goto('/yardim')
    await expect(page.locator('details').first()).toBeVisible()
  })

  test('private areas redirect to login', async ({ page }) => {
    await page.goto('/hesab/elanlar')
    await expect(page).toHaveURL(/\/giris\?next=%2Fhesab%2Felanlar/)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/giris/)
  })

  test('unknown listing returns 404', async ({ page }) => {
    const response = await page.goto('/elan/999999999-yoxdur')
    expect(response?.status()).toBe(404)
  })

  test('cross-origin API writes are rejected', async ({ request }) => {
    const res = await request.post('/api/account/avatar', { headers: { origin: 'https://evil.example' } })
    expect(res.status()).toBe(403)
  })
})

const sellerEmail = process.env.E2E_SELLER_EMAIL
const sellerPassword = process.env.E2E_SELLER_PASSWORD

test.describe('seller journey (requires Supabase test account)', () => {
  test.skip(!sellerEmail || !sellerPassword, 'Set E2E_SELLER_EMAIL and E2E_SELLER_PASSWORD to run')

  test('log in, start a listing and save a draft', async ({ page }) => {
    await page.goto('/giris?next=/elan-yerlesdir')
    await page.getByLabel('E-poçt').fill(sellerEmail!)
    await page.getByLabel('Şifrə').fill(sellerPassword!)
    await page.getByRole('button', { name: 'Daxil ol' }).click()
    await expect(page).toHaveURL(/\/elan-yerlesdir/)

    await page.getByLabel('Başlıq').fill(`E2E test elanı ${Date.now()}`)
    await page.getByLabel('Kateqoriya').selectOption({ label: 'Optika və işıqlar' })
    await page.getByLabel('Alt kateqoriya').selectOption({ label: 'Faralar' })
    await page.getByText('İşlənmiş').click()
    await page.getByLabel('Qiymət, ₼').fill('120')
    await page.getByRole('button', { name: 'Davam et' }).click()
    await expect(page).toHaveURL(/\/hesab\/elanlar\/[0-9a-f-]+\/redakte/)
    await page.goto('/hesab/elanlar?status=draft')
    await expect(page.getByText('E2E test elanı').first()).toBeVisible()
  })
})
