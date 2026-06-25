import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const LocationSchema = z.object({
  name:       z.string().min(1),
  type:       z.enum(['WAREHOUSE','SHOP']),
  address:    z.string().optional().nullable(),
  phone:      z.string().optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  is_active:  z.boolean().default(true),
})

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select('*, manager:users!manager_id(id, full_name)')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = LocationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await (supabase.from('locations') as any).insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
