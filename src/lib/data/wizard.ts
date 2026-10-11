import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getCategories, getCities, getListingSettings, getMakes, getModels } from '@/lib/data/catalog'
import { getListingById } from '@/lib/data/listings'
import { listingImageUrl } from '@/lib/storage'
import type { WizardOptions, WizardValues } from '@/components/listings/listing-wizard'
import type { ManagedImage } from '@/components/listings/image-manager'

export async function getWizardOptions(): Promise<WizardOptions> {
  const [categories, makes, models, cities] = await Promise.all([getCategories(), getMakes(), getModels(), getCities()])
  return {
    categories: categories.map(({ id, name, parent_id }) => ({ id, name, parent_id })),
    makes: makes.map(({ id, name }) => ({ id, name })),
    models: models.map(({ id, make_id, name }) => ({ id, make_id, name })),
    cities: cities.map(({ slug, name, region }) => ({ slug, name, region })),
  }
}

export async function getWizardDefaults(userId: string): Promise<WizardValues> {
  const supabase = await createClient()
  const [{ data: priv }, { data: profile }] = await Promise.all([
    supabase.from('profile_private').select('phone, default_contact_method').eq('id', userId).maybeSingle(),
    supabase.from('profiles').select('city_slug').eq('id', userId).maybeSingle(),
  ])
  return {
    title: '',
    description: '',
    price: '',
    is_negotiable: false,
    category_id: '',
    condition: '',
    city_slug: (profile?.city_slug as string | null) ?? '',
    make_id: '',
    model_id: '',
    year_from: '',
    year_to: '',
    engine_type: '',
    engine_volume: '',
    oem_code: '',
    manufacturer: '',
    originality: '',
    compatibility_notes: '',
    delivery_available: false,
    pickup_available: true,
    delivery_notes: '',
    warranty_months: '',
    warranty_notes: '',
    contact_method: ((priv?.default_contact_method as WizardValues['contact_method'] | null) ?? 'both'),
    contact_phone: (priv?.phone as string | null) ?? '',
  }
}

/** Loads a listing for editing. Returns null unless the current user owns it. */
export async function getEditableListing(listingId: string, userId: string) {
  const listing = await getListingById(listingId)
  if (!listing || listing.owner_id !== userId) return null
  const supabase = await createClient()
  const { data: contact } = await supabase.from('listing_contacts').select('phone').eq('listing_id', listingId).maybeSingle()
  const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
  const values: WizardValues = {
    title: listing.title,
    description: listing.description,
    price: s(listing.price),
    is_negotiable: listing.is_negotiable,
    category_id: s(listing.category_id),
    condition: s(listing.condition),
    city_slug: s(listing.city_slug),
    make_id: s(listing.make_id),
    model_id: s(listing.model_id),
    year_from: s(listing.year_from),
    year_to: s(listing.year_to),
    engine_type: s(listing.engine_type),
    engine_volume: s(listing.engine_volume),
    oem_code: s(listing.oem_code),
    manufacturer: s(listing.manufacturer),
    originality: s(listing.originality),
    compatibility_notes: s(listing.compatibility_notes),
    delivery_available: listing.delivery_available,
    pickup_available: listing.pickup_available,
    delivery_notes: s(listing.delivery_notes),
    warranty_months: s(listing.warranty_months),
    warranty_notes: s(listing.warranty_notes),
    contact_method: listing.contact_method,
    contact_phone: s(contact?.phone),
  }
  const images: ManagedImage[] = listing.images.map((img) => ({
    id: img.id,
    url: listingImageUrl(img.storage_path) ?? '',
    thumbUrl: listingImageUrl(img.thumb_path) ?? '',
  }))
  return { listing, values, images }
}

export async function getWizardSettings() {
  const s = await getListingSettings()
  return { min_photos: s.min_photos, max_photos: s.max_photos, require_moderation: s.require_moderation }
}
