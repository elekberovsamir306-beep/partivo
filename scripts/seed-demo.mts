/**
 * Creates CLEARLY LABELLED sample data for local/staging demos (never run against production with real users).
 * - 2 sample sellers (emails @demo.partivo.test), 10 listings, each with 5 generated "NÜMUNƏ" images.
 * - Every listing description starts with "NÜMUNƏ ELAN — real satış deyil".
 * Usage:  npm run seed:demo           (create)
 *         npm run seed:demo -- --clean (delete all sample users and their data)
 */
import { randomUUID, createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })
const DOMAIN = 'demo.partivo.test'
const LABEL = 'NÜMUNƏ ELAN — real satış deyil. '

async function clean() {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
  for (const user of data.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`))) {
    for (const bucket of ['listing-images', 'avatars']) {
      const { data: folders } = await db.storage.from(bucket).list(user.id)
      for (const f of folders ?? []) {
        const { data: files } = await db.storage.from(bucket).list(`${user.id}/${f.name}`)
        const paths = (files ?? []).map((x) => `${user.id}/${f.name}/${x.name}`)
        if (paths.length) await db.storage.from(bucket).remove(paths)
      }
    }
    await db.auth.admin.deleteUser(user.id)
    console.log(`removed ${user.email}`)
  }
}

function svg(title: string, hue: number, index: number) {
  const safe = title.replace(/[<>&"]/g, '')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},14%,22%)"/><stop offset="1" stop-color="hsl(${hue},18%,8%)"/></linearGradient></defs>
    <rect width="1600" height="1200" fill="url(#g)"/>
    <circle cx="${1100 - index * 60}" cy="560" r="330" fill="none" stroke="#c9ced6" stroke-width="46" opacity="0.55"/>
    <circle cx="${1100 - index * 60}" cy="560" r="120" fill="#ff6b1a" opacity="0.85"/>
    <text x="100" y="220" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="#f3f4f6">${safe}</text>
    <text x="100" y="1080" font-family="Arial, sans-serif" font-size="96" font-weight="800" fill="#ff6b1a">NÜMUNƏ</text>
    <text x="100" y="1140" font-family="Arial, sans-serif" font-size="36" fill="#a2a8b3">Demo şəkil ${index + 1}/5 · real məhsul deyil</text>
  </svg>`)
}

const SAMPLES = [
  { title: 'Toyota Camry 70 ön sol fara', category: 'faralar', make: 'toyota', model: 'camry', price: 420, condition: 'used', oem: '81150-33D70' },
  { title: 'Hyundai Elantra əyləc kolodkaları dəsti', category: 'eylec-kolodkalari', make: 'hyundai', model: 'elantra', price: 55, condition: 'new', oem: '58101-F2A00' },
  { title: 'Mercedes-Benz E-Class W212 generator', category: 'generator-ve-starter', make: 'mercedes-benz', model: 'e-class', price: 280, condition: 'refurbished', oem: 'A0131546802' },
  { title: 'Kia Sportage ön amortizator cütü', category: 'amortizatorlar', make: 'kia', model: 'sportage', price: 190, condition: 'new', oem: '54651-D7100' },
  { title: 'BMW X5 E70 radiator', category: 'radiatorlar', make: 'bmw', model: 'x5', price: 230, condition: 'used', oem: '17117533472' },
  { title: 'Lexus RX arxa sağ stop', category: 'arxa-stoplar', make: 'lexus', model: 'rx', price: 310, condition: 'used', oem: '81551-0E120' },
  { title: 'Chevrolet Cruze yağ filtri (10 ədəd)', category: 'filtrler', make: 'chevrolet', model: 'cruze', price: 45, condition: 'new', oem: '93185674' },
  { title: 'Toyota Prius hibrid akkumulyator bloku', category: 'akkumulyatorlar', make: 'toyota', model: 'prius', price: 950, condition: 'refurbished', oem: 'G9280-47060' },
  { title: 'LADA Priora ön bamper', category: 'bamperler', make: 'lada', model: 'priora', price: 85, condition: 'new', oem: null },
  { title: 'Land Rover Range Rover Sport ön rıçaq', category: 'ricaqlar-ve-sarovoylar', make: 'land-rover', model: 'range-rover-sport', price: 260, condition: 'used', oem: 'LR073358' },
]

async function seed() {
  const lookup = async (table: string, slug: string, makeId?: number | null) => {
    let q = db.from(table).select('id').eq('slug', slug)
    if (makeId) q = q.eq('make_id', makeId)
    const { data } = await q.limit(1).maybeSingle()
    return (data?.id as number | undefined) ?? null
  }

  const sellers: string[] = []
  for (const [i, name] of ['Nümunə Satıcı (fərdi)', 'Nümunə Avto Mağaza'].entries()) {
    const email = `seller${i + 1}@${DOMAIN}`
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: `Demo-${randomUUID()}`,
      email_confirm: true,
      user_metadata: { display_name: name },
    })
    if (error) throw new Error(`${email}: ${error.message} (run with --clean first?)`)
    sellers.push(data.user.id)
    if (i === 1) {
      await db.from('profiles').update({ seller_type: 'business', business_name: 'Nümunə Avto Mağaza', city_slug: 'baki' }).eq('id', data.user.id)
    }
  }

  for (const [i, s] of SAMPLES.entries()) {
    const owner = sellers[i % 2]
    const makeId = await lookup('vehicle_makes', s.make)
    const modelId = makeId ? await lookup('vehicle_models', s.model, makeId) : null
    const { data: listing, error } = await db
      .from('listings')
      .insert({
        owner_id: owner,
        title: s.title,
        description: `${LABEL}Bu elan saytın necə işlədiyini göstərmək üçün yaradılıb. Hissə yaxşı vəziyyətdədir, quraşdırmadan əvvəl uyğunluğu OEM kodu ilə yoxlayın.`,
        price: s.price,
        category_id: await lookup('categories', s.category),
        condition: s.condition,
        city_slug: i % 3 === 0 ? 'gence' : 'baki',
        make_id: makeId,
        model_id: modelId,
        year_from: 2014 + (i % 5),
        year_to: 2020 + (i % 4),
        oem_code: s.oem,
        delivery_available: i % 2 === 0,
        contact_method: 'both',
      })
      .select('id, title')
      .single()
    if (error) throw error
    await db.from('listing_contacts').insert({ listing_id: listing.id, owner_id: owner, phone: '+994500000000' })

    for (let n = 0; n < 5; n++) {
      const full = await sharp(svg(s.title, (i * 37) % 360, n)).webp({ quality: 82 }).toBuffer()
      const thumb = await sharp(full).resize(640, 480, { fit: 'cover' }).webp({ quality: 76 }).toBuffer()
      const base = `${owner}/${listing.id}/${randomUUID()}`
      await db.storage.from('listing-images').upload(`${base}.webp`, full, { contentType: 'image/webp' })
      await db.storage.from('listing-images').upload(`${base}-thumb.webp`, thumb, { contentType: 'image/webp' })
      await db.from('listing_images').insert({
        listing_id: listing.id, owner_id: owner, storage_path: `${base}.webp`, thumb_path: `${base}-thumb.webp`,
        width: 1600, height: 1200, size_bytes: full.byteLength, content_hash: createHash('sha256').update(full).digest('hex'), position: n,
      })
    }

    // Publish directly as the service role (bypasses moderation for demo data only).
    await db
      .from('listings')
      .update({ status: 'active', published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
      .eq('id', listing.id)
    console.log(`✓ ${listing.title}`)
  }
  console.log(`\nDone. Sample sellers: seller1@${DOMAIN}, seller2@${DOMAIN} (random passwords; use password reset if needed).`)
}

if (process.argv.includes('--clean')) await clean()
else await seed()
