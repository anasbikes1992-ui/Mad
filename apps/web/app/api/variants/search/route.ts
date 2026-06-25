import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const q        = searchParams.get('q') ?? ''
  const barcode  = searchParams.get('barcode')
  const location = searchParams.get('location')
  const limit    = Number(searchParams.get('limit') ?? '20')

  let query = supabase
    .from('product_variants')
    .select(`
      id, item_code, name, color, color_hex, unit, cost_price, selling_price, barcode,
      product:products(id, name, category:categories(id, name)),
      stock_balances(location_id, quantity_on_hand, quantity_available, location:locations(name))
    `)
    .eq('is_active', true)
    .limit(limit)

  if (barcode) {
    query = query.eq('barcode', barcode)
  } else if (q) {
    query = query.or(`item_code.ilike.%${q}%,name.ilike.%${q}%,color.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter stock balances to specific location if provided
  const result = location
    ? data?.map((v) => ({
        ...v,
        stock_balances: v.stock_balances.filter(
          (b: { location_id: string }) => b.location_id === location
        ),
      }))
    : data

  return NextResponse.json({ data: result })
}
