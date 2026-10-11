export interface ListingCard {
  id: string
  ref_no: number
  slug: string
  title: string
  price: number | null
  is_negotiable: boolean
  condition: 'new' | 'used' | 'refurbished' | null
  category_name: string | null
  city_name: string | null
  make_name: string | null
  model_name: string | null
  year_from: number | null
  year_to: number | null
  oem_code: string | null
  delivery_available: boolean
  view_count: number
  published_at: string | null
  is_top: boolean
  is_vip: boolean
  is_premium: boolean
  is_highlighted: boolean
  seller_name: string | null
  seller_type: 'private' | 'business' | null
  seller_verified: boolean | null
  cover_thumb_path: string | null
}

export interface Category {
  id: number
  parent_id: number | null
  slug: string
  name: string
  icon: string | null
  description: string | null
  sort_order: number
  is_active: boolean
}

export interface CategoryNode extends Category {
  children: Category[]
}

export interface VehicleMake {
  id: number
  slug: string
  name: string
  is_popular: boolean
  sort_order: number
  is_active: boolean
}

export interface VehicleModel {
  id: number
  make_id: number
  slug: string
  name: string
  year_from: number | null
  year_to: number | null
  is_active: boolean
}

export interface City {
  slug: string
  name: string
  region: string
  sort_order: number
}

export interface ListingSettings {
  duration_days: number
  renewal_window_days: number
  max_active_per_user: number
  min_photos: number
  max_photos: number
  require_moderation: boolean
}

export interface HomepageSettings {
  sections: Record<'premium' | 'vip' | 'recent' | 'categories' | 'makes' | 'business', boolean>
  popular_searches: string[]
}

export interface PromotionPackage {
  id: number
  code: string
  name: string
  description: string
  features: string[]
  price: number
  currency: string
  duration_days: number
  placements: string[]
  is_active: boolean
  sort_order: number
}
