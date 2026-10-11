# Partivo: deployment and operations guide

## 1. Supabase
1. Create a project at [supabase.com](https://supabase.com). The Frankfurt (eu-central-1) region is close to Azerbaijan.
2. Apply the migrations: `npx supabase link --project-ref <ref>` and then `npx supabase db push`. This also creates the storage buckets (`listing-images`, `avatars`) and their policies.
3. **Authentication → URL Configuration**
   - Site URL: `https://partivo.az`
   - Redirect URLs: `https://partivo.az/auth/confirm`, `https://www.partivo.az/auth/confirm`, `http://localhost:3000/auth/confirm`
4. **Authentication → Email Templates**: copy the contents of `supabase/templates/confirmation.html` and `recovery.html`. These use the token-hash flow, so the link opens correctly in any browser.
5. **Email provider (required)**: Supabase's built-in SMTP has very low limits. Set up your own SMTP under Project Settings → Auth → SMTP (for example Resend, Postmark or Amazon SES). This needs SPF/DKIM records for the `partivo.az` domain.
6. Phone verification (optional): connect an SMS provider under Auth → Phone, then set `NEXT_PUBLIC_PHONE_VERIFICATION=true`.

## 2. Vercel
1. Import the repository and set every variable from `.env.example` under Settings → Environment Variables.
   - `SUPABASE_SERVICE_ROLE_KEY`, `EPOINT_PRIVATE_KEY`, `CRON_SECRET` and `IP_HASH_SALT` are **server-only**. Never give them a `NEXT_PUBLIC_` prefix.
2. `NEXT_PUBLIC_SITE_URL=https://partivo.az`.
3. Build command: `npm run build`. Node 20.9 or newer.
4. Cron: `vercel.json` calls `/api/cron/maintenance` once a day. That is the maximum on the Hobby plan; on Pro, every 15 minutes (`*/15 * * * *`) is recommended. Vercel sends `CRON_SECRET` automatically in the `Authorization: Bearer …` header.
   - Note: listings and promotions disappear from public view on time even without the cron. Visibility is calculated from timestamps; the cron updates statuses, sends notifications and reconciles payments.

## 3. Domain (partivo.az) and HTTPS
1. Buy the domain from a `.az` registrar (for example via Azercell/AzNet resellers or IntraNS).
2. In Vercel, go to Settings → Domains and add `partivo.az` and `www.partivo.az`.
3. At the registrar, add the DNS records:
   - `partivo.az`: **A** `76.76.21.21`
   - `www`: **CNAME** `cname.vercel-dns.com`
   - Confirm both values on the Domains page in Vercel; the values shown there take precedence.
4. Vercel issues the SSL certificate automatically. HSTS headers are already configured (`next.config.ts`).
5. Update the URLs in Supabase Auth (step 1.3) to the final domain.

> The domain will only work once these steps are complete and the DNS has propagated (usually from a few minutes up to 48 hours).

## 4. Payments: Epoint
The integration was built from the official documentation at [developer.epoint.az](https://developer.epoint.az), checked 2026-10-10:
- `POST https://epoint.az/api/1/request` creates a payment and returns `redirect_url`.
- `POST https://epoint.az/api/1/get-status` returns the status.
- The signature is `base64(sha1_raw(private_key + data + private_key))`; `data` is base64-encoded JSON.

**What remains for you:**
1. Sign a merchant agreement with Epoint and receive `public_key` and `private_key`.
2. In the Epoint merchant cabinet, set the result (callback) URL to: `https://partivo.az/api/payments/epoint/callback`
3. In Vercel: `PAYMENT_PROVIDER=epoint`, `EPOINT_PUBLIC_KEY=…`, `EPOINT_PRIVATE_KEY=…`
4. Before going live, run a small real test payment and a refund.

**Guarantees:**
- The price is always taken from the database; the amount from the browser is never trusted.
- The callback signature is verified with a timing-safe comparison.
- `confirm_payment` is idempotent: if the same callback arrives several times, the promotion is activated only once. If the amount does not match, the promotion is not activated.
- Card numbers and CVV are never stored; only the masked number returned by Epoint is kept.
- Pending payments are reconciled through `get-status`, both by the cron and on the result page.
- While credentials are missing (`PAYMENT_PROVIDER=none`), the user sees "Ödəniş hələ qoşulmayıb". No simulated success is shown.
- `PAYMENT_PROVIDER=mock` exists for local testing only, is blocked in production builds, and is labelled "TEST" everywhere it appears.
- Refunds: issue the refund in the Epoint cabinet first, then record it at `/admin/odenisler`. `returned` callbacks from Epoint are also processed automatically.

## 5. Security notes
- RLS is enabled on every table. Users can never write system columns such as `status`, `is_verified` or `promo_*`; column grants block it.
- Admin roles live in the `staff_roles` table, which only a super-admin can change. Every privileged action is written to `audit_logs`.
- Rate limiting is backed by Postgres: login, registration, password reset, listing creation, image upload, phone-number reveal, reports, contact form and checkout. IP addresses are stored only as salted hashes.
- Phone numbers are not included in page HTML. They are revealed only on a "Nömrəni göstər" click, with a rate limit.
- Images are checked from their real content with sharp, EXIF/GPS metadata is removed, and they are re-encoded to WebP. Photos reused from another seller send the listing to manual moderation.
- `/api/*` POST requests are rejected unless they come from the same origin (CSRF); server actions have Next.js's built-in protection.
- Response headers: CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy.
- **Before production:** have a security specialist audit the system, and have a lawyer review the legal texts (terms, privacy, refunds) under Azerbaijani law. The texts in the repository are templates.

## 6. Backup, monitoring and rollback
- **Backups:** the Supabase Pro plan gives daily backups and PITR (point-in-time recovery). Also export a weekly copy with `pg_dump` to separate storage, and back up the storage buckets periodically.
- **Monitoring:** Vercel Logs/Observability, Supabase Logs (API, Auth, Postgres). For error tracking, a tool like Sentry can be connected through `instrumentation.ts`. Watch the `payment_events` table and `audit_logs` → `payment_requires_refund` records.
- **Rollback:** in Vercel, go to Deployments → previous version → "Promote to Production" (instant).
  - Migrations are forward-only. If you need to reverse a change, write a new migration.
  - Run risky migrations on a staging/branch project first.

## 7. Launch checklist
- [ ] Migrations applied and `npm run db:check` passes
- [ ] SMTP connected; registration and password-reset emails arrive
- [ ] First super-admin created (`npm run admin:create`)
- [ ] Epoint keys added, callback URL entered in the cabinet, real test payment completed
- [ ] `CRON_SECRET` and `IP_HASH_SALT` set
- [ ] Domain and HTTPS working, Supabase redirect URLs updated
- [ ] Legal texts reviewed by a lawyer and updated at `/admin/mezmun`
- [ ] Lighthouse measured on mobile (performance has not yet been measured with real data)
