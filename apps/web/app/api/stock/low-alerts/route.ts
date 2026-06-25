import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location')

  let query = supabase
    .from('stock_balances')
    .select(`
      variant_id, location_id, quantity_on_hand, quantity_available,
      variant:product_variants!inner(
        id, item_code, name, color, unit, min_stock_alert,
        product:products(name, category:categories(name))
      ),
      location:locations(id, name, type)
    `)

  if (locationId) query = query.eq('location_id', locationId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lowStockItems = (data ?? []).filter((row) => {
    const minAlert = (row.variant as { min_stock_alert: number })?.min_stock_alert ?? 0
    return minAlert > 0 && row.quantity_available <= minAlert
  })

  return NextResponse.json({ data: lowStockItems, count: lowStockItems.length })
}
