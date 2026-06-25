import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateStockInSchema = z.object({
  location_id:   z.string().uuid(),
  supplier_name: z.string().min(1),
  reference_no:  z.string().optional(),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes:         z.string().optional(),
  items: z.array(z.object({
    variant_id: z.string().uuid(),
    quantity:   z.number().positive(),
    unit:       z.string(),
    cost_price: z.number().min(0),
    notes:      z.string().optional(),
  })).min(1, 'At least one item required'),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location')
  const status   = searchParams.get('status')
  const limit    = Number(searchParams.get('limit') ?? '50')
  const offset   = Number(searchParams.get('offset') ?? '0')

  let query = supabase
    .from('stock_ins')
    .select(`
      *,
      location:locations(id, name, type),
      confirmed_by_user:users!confirmed_by(id, full_name),
      stock_in_items(
        id, quantity, unit, cost_price,
        variant:product_variants(id, item_code, name, color)
      )
    `, { count: 'exact' })
    .order('received_date', { ascending: false })
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
  const parsed = CreateStockInSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { items, ...header } = parsed.data

  const { data: stockIn, error: siError } = await (supabase.from('stock_ins') as any)
    .insert({ ...header, created_by: user.id })
    .select()
    .single()

  if (siError) return NextResponse.json({ error: siError.message }, { status: 500 })

  const { error: itemsError } = await (supabase.from('stock_in_items') as any).insert(
    items.map((item) => ({ ...item, stock_in_id: stockIn.id }))
  )

  if (itemsError) {
    await supabase.from('stock_ins').delete().eq('id', stockIn.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ data: stockIn }, { status: 201 })
}
