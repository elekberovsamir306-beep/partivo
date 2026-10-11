import { ListingGridSkeleton } from '@/components/listings/listing-card'

export default function Loading() {
  return (
    <div className="container-page py-10" aria-busy="true" aria-label="Yüklənir">
      <div className="skeleton mb-8 h-9 w-64 rounded-lg" />
      <ListingGridSkeleton />
    </div>
  )
}
