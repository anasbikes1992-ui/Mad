import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const VariantSchema = z.object({
  product_id:      z.string().uuid(),
  name:            z.string().min(1),
  color:           z.string().optional(),
  color_hex:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  width_inches:    z.number().optional().nullable(),
  gsm:             z.number().int().optional().nullable(),
  material:        z.string().optional().nullable(),
  weave:           z.string().optional().nullable(),
  attributes:      z.record(z.unknown()).default({}),
  unit:            z.enum(['yards','meters','bales','pieces','rolls','kg']),
  pieces_per_bale: z.number().int().optional().nullable(),
  cost_price:      z.number().min(0).default(0),
  selling_price:   z.number().min(0).default(0),
  barcode:         z.string().optional().nullable(),
  min_stock_alert: z.number().min(0).default(0),
  is_active:       z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const product  = searchParams.get('product')
  const category = searchParams.get('category')
  const color    = searchParams.get('color')
  const unit     = searchParams.get('unit')
  const active   = searchParams.get('active')
  const limit    = Number(searchParams.get('limit') ?? '200')

  let query = supabase
    .from('product_variants')
    .select(`
      *,
      product:products(
        id, name, category_id,
        category:categories(id, name, prefix)
      ),
      stock_balances(location_id, quantity_on_hand, quantity_available)
    `, { count: 'exact' })
    .order('item_code')
    .limit(limit)

  if (product)  query = query.eq('product_id', product)
  if (color)    query = query.ilike('color', `%${color}%`)
  if (unit)     query = query.eq('unit', unit)
  if (active !== null) query = query.eq('is_active', active === 'true')

  if (category) {
    const { data: products } = await supabase
      .from('products').select('id').eq('category_id', category)
    if (products) query = query.in('product_id', products.map((p) => p.id))
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = VariantSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('product_variants')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
