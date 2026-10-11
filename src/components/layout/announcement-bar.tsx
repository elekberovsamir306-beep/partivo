import Link from 'next/link'
import { getActiveAnnouncements } from '@/lib/data/catalog'

export async function AnnouncementBar() {
  const [announcement] = await getActiveAnnouncements()
  if (!announcement) return null
  const tone =
    announcement.level === 'warning'
      ? 'bg-warning-soft text-fg'
      : announcement.level === 'success'
        ? 'bg-success-soft text-fg'
        : 'bg-accent-soft text-fg'
  const content = (
    <>
      <strong className="font-semibold">{announcement.title}</strong>
      {announcement.body ? <span className="text-muted"> — {announcement.body}</span> : null}
    </>
  )
  return (
    <div className={`border-b border-line text-center text-sm ${tone}`}>
      <div className="container-page py-2">
        {announcement.link ? (
          <Link href={announcement.link} className="underline-offset-4 hover:underline">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
