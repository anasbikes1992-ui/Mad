import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateAdjustmentSchema = z.object({
  location_id: z.string().uuid(),
  reason:      z.enum(['DAMAGE','LOSS','FOUND','RECOUNT','OTHER']),
  notes:       z.string().optional(),
  items: z.array(z.object({
    variant_id:   z.string().uuid(),
    unit:         z.string(),
    system_qty:   z.number().min(0),
    physical_qty: z.number().min(0),
    notes:        z.string().optional(),
  })).min(1),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location')
  const status   = searchParams.get('status')
  const limit    = Number(searchParams.get('limit') ?? '50')
  const offset   = Number(searchParams.get('offset') ?? '0')

  let query = supabase
    .from('stock_adjustments')
    .select(`
      *,
      location:locations(id, name, type),
      confirmed_by_user:users!confirmed_by(id, full_name),
      stock_adjustment_items(
        id, unit, system_qty, physical_qty, difference, notes,
        variant:product_variants(id, item_code, name, color)
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (location) query = query.eq('location_id', location)
  if (status)   query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateAdjustmentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { items, ...header } = parsed.data

  const { data: adjustment, error: adjError } = await supabase
    .from('stock_adjustments')
    .insert({ ...header, created_by: user.id })
    .select()
    .single()

  if (adjError) return NextResponse.json({ error: adjError.message }, { status: 500 })

  const { error: itemsError } = await supabase.from('stock_adjustment_items').insert(
    items.map((item) => ({ ...item, adjustment_id: adjustment.id }))
  )

  if (itemsError) {
    await supabase.from('stock_adjustments').delete().eq('id', adjustment.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ data: adjustment }, { status: 201 })
}
