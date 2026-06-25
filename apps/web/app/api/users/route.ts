import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const InviteSchema = z.object({
  email:        z.string().email(),
  full_name:    z.string().min(1),
  role:         z.enum(['ADMIN','MANAGER','STORE_KEEPER','VIEWER']),
  location_ids: z.array(z.string().uuid()).default([]),
})

export async function GET() {
  const supabase = await createClient()
  const { data: currentUser } = await supabase.from('users').select('role').eq(
    'id', (await supabase.auth.getUser()).data.user?.id ?? ''
  ).single()

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('users')
    .select('*, user_locations(location_id, location:locations(name))')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (currentUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { email, full_name, role, location_ids } = parsed.data

  // Create auth user via service role (sends invite email)
  const { data: authUser, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // The handle_new_auth_user trigger auto-creates the users row.
  // Update role since the trigger uses raw_user_meta_data
  await adminClient.from('users').update({ role, full_name }).eq('id', authUser.user.id)

  // Assign locations
  if (location_ids.length > 0) {
    await adminClient.from('user_locations').insert(
      location_ids.map((lid) => ({ user_id: authUser.user.id, location_id: lid }))
    )
  }

  return NextResponse.json({ data: { id: authUser.user.id, email, full_name, role } }, { status: 201 })
}
