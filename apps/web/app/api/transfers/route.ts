import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateTransferSchema = z.object({
  from_location_id: z.string().uuid(),
  to_location_id:   z.string().uuid(),
  notes:            z.string().optional(),
  items: z.array(z.object({
    variant_id:         z.string().uuid(),
    quantity_requested: z.number().positive(),
    unit:               z.string(),
  })).min(1, 'At least one item required'),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const status   = searchParams.get('status')
  const location = searchParams.get('location')
  const limit    = Number(searchParams.get('limit') ?? '50')
  const offset   = Number(searchParams.get('offset') ?? '0')

  let query = supabase
    .from('transfers')
    .select(`
      *,
      from_location:locations!from_location_id(id, name, type),
      to_location:locations!to_location_id(id, name, type),
      requested_by_user:users!requested_by(id, full_name),
      approved_by_user:users!approved_by(id, full_name),
      transfer_items(
        id, variant_id, quantity_requested, quantity_dispatched, quantity_received, unit,
        variant:product_variants(id, item_code, name, color, unit, cost_price)
      )
    `)
    .order('requested_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (location) query = query.or(`from_location_id.eq.${location},to_location_id.eq.${location}`)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateTransferSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { from_location_id, to_location_id, notes, items } = parsed.data

  if (from_location_id === to_location_id) {
    return NextResponse.json({ error: 'Source and destination locations must differ' }, { status: 400 })
  }

  // Validate available stock for each item
  for (const item of items) {
    const { data: balance } = await supabase
      .from('stock_balances')
      .select('quantity_available')
      .eq('variant_id', item.variant_id)
      .eq('location_id', from_location_id)
      .single()

    const available = balance?.quantity_available ?? 0
    if (item.quantity_requested > available) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('item_code, name')
        .eq('id', item.variant_id)
        .single()
      return NextResponse.json({
        error: `Insufficient stock for ${variant?.item_code ?? item.variant_id}: requested ${item.quantity_requested}, available ${available}`,
      }, { status: 422 })
    }
  }

  // Create transfer
  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .insert({ from_location_id, to_location_id, notes, requested_by: user.id })
    .select()
    .single()

  if (transferError) return NextResponse.json({ error: transferError.message }, { status: 500 })

  // Insert items
  const { error: itemsError } = await supabase.from('transfer_items').insert(
    items.map((item) => ({ ...item, transfer_id: transfer.id }))
  )

  if (itemsError) {
    await supabase.from('transfers').delete().eq('id', transfer.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ data: transfer }, { status: 201 })
}
