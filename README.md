# Partivo.az

Partivo is a marketplace for car spare parts in Azerbaijan. It covers the whole flow: listings, search, sellers, paid promotions, moderation and an admin panel.

**Stack:** Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, Supabase (Postgres + Auth + Storage), Zod 4, Motion, React Three Fiber, sharp, Vitest, PGlite, Playwright.

## Running locally

```bash
npm install
cp .env.example .env.local      # fill in the Supabase values
npm run dev                      # http://localhost:3000
```

The site also runs without Supabase. Pages render with empty states and the legal pages are read from the seed migration. To use the full feature set (sign-up, listings, uploads), connect a Supabase project; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Database
```bash
npx supabase link --project-ref <ref>
npx supabase db push            # applies every migration in supabase/migrations
npm run db:check                # verifies the migrations in PGlite, no Docker needed
```

### First administrator
1. Register on the site and confirm your email address.
2. Run `npm run admin:create -- you@partivo.az`. This works only while no super-admin exists yet, and no password is created or stored.
3. Grant further roles at `/admin/heyet`.

### Sample (demo) data
`npm run seed:demo` creates 2 sample sellers and 10 listings with generated images labelled "NÜMUNƏ". Remove them with `npm run seed:demo -- --clean`. Do not run this in production.

## Commands
| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Development, production build, production server |
| `npm run lint` / `typecheck` | ESLint, TypeScript |
| `npm test` | Unit tests plus database tests (migrations, RLS, payments in PGlite) |
| `npm run test:e2e` | Playwright (seller tests need `E2E_SELLER_EMAIL` / `E2E_SELLER_PASSWORD`) |
| `npm run screenshots` | Screenshots of the key pages |

## Architecture
- **`supabase/migrations/`**: schema, business functions, RLS and column grants, storage policies, reference data (74 cities and districts across 14 economic regions, 59 categories, 22 makes and 91 models) and editable content pages.
  - Rules that matter (publishing, moderation, payment confirmation, promotion activation, expiry) live in `SECURITY DEFINER` functions, so they hold no matter which client calls them.
  - Users cannot write system columns such as `status`, `is_verified` or `promo_*` directly; column grants block it.
- **`src/lib/`**: Supabase clients (server, browser, service-role), validation, payments (`payments/epoint.ts`, `service.ts`), image processing, rate limiting, search parameters.
- **`src/app/`**: public pages, account area (`/hesab`), admin area (`/admin`), API routes (image upload, Epoint callback, cron, data export).
- **`src/i18n/`**: the Azerbaijani dictionary. Russian and English can be added later with the same structure.

Security and payments are described in detail in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
