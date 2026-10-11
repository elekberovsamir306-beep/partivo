import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

/** Downloads everything Partivo stores about the signed-in user as JSON (public.export_my_data). */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('export_my_data')
  if (error) return NextResponse.json({ message: 'Export failed' }, { status: 500 })
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="partivo-melumatlarim-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
