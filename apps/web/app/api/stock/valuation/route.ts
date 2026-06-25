import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location')

  let query = supabase
    .from('stock_balances')
    .select(`
      variant_id, location_id, quantity_on_hand,
      variant:product_variants(
        id, item_code, name, color, unit, cost_price,
        product:products(
          id, name,
          category:categories(id, name)
        )
      ),
      location:locations(id, name, type)
    `)
    .gt('quantity_on_hand', 0)

  if (locationId) query = query.eq('location_id', locationId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute total value per row and aggregate
  const rows = (data ?? []).map((row) => ({
    ...row,
    total_value: row.quantity_on_hand * ((row.variant as { cost_price: number })?.cost_price ?? 0),
  }))

  const grandTotal = rows.reduce((sum, r) => sum + r.total_value, 0)

  // Group by category
  const byCategory: Record<string, { category: string; total: number; items: typeof rows }> = {}
  rows.forEach((row) => {
    const cat = (row.variant as { product?: { category?: { name: string } } })?.product?.category?.name ?? 'Uncategorised'
    if (!byCategory[cat]) byCategory[cat] = { category: cat, total: 0, items: [] }
    byCategory[cat]!.total += row.total_value
    byCategory[cat]!.items.push(row)
  })

  return NextResponse.json({
    data: rows,
    summary: {
      grand_total: grandTotal,
      by_category: Object.values(byCategory).sort((a, b) => b.total - a.total),
    },
  })
}
