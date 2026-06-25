import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  if (me?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body: { role?: string; is_active?: boolean; location_ids?: string[] } = await req.json()

  const update: Record<string, unknown> = {}
  if (body.role      !== undefined) update.role      = body.role
  if (body.is_active !== undefined) update.is_active = body.is_active

  if (Object.keys(update).length > 0) {
    const { error } = await (supabase.from('users') as any).update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Array.isArray(body.location_ids)) {
    await supabase.from('user_locations').delete().eq('user_id', id)
    if (body.location_ids.length > 0) {
      const rows = body.location_ids.map((lid) => ({ user_id: id, location_id: lid }))
      const { error } = await (supabase.from('user_locations') as any).insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
