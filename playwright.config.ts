import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests. Public journeys run against any build; seller/admin journeys need a configured
 * Supabase project with test credentials (E2E_SELLER_EMAIL / E2E_SELLER_PASSWORD) and are skipped otherwise.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'npm run start', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
})
