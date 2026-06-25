import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  if (!['ADMIN','MANAGER'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('locations')
    .update({ name: body.name, code: body.code, type: body.type, address: body.address, phone: body.phone, manager_id: body.manager_id, is_active: body.is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
