import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('settings').select('*').order('key')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentUserData } = await supabase.from('users').select('role').eq('id', user.id).single()
  const currentUser = currentUserData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null
  if (currentUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body: Record<string, unknown> = await request.json()
  const updates = Object.entries(body).map(([key, value]) => ({
    key,
    value: JSON.stringify(value),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('settings').upsert(updates, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = await supabase.from('settings').select('*').order('key')
  return NextResponse.json({ data })
}
