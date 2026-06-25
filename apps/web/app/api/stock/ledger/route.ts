import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const variant   = searchParams.get('variant')
  const location  = searchParams.get('location')
  const type      = searchParams.getAll('type')
  const dateFrom  = searchParams.get('from')
  const dateTo    = searchParams.get('to')
  const limit     = Number(searchParams.get('limit') ?? '100')
  const offset    = Number(searchParams.get('offset') ?? '0')

  let query = supabase
    .from('stock_ledger')
    .select(`
      *,
      variant:product_variants(id, item_code, name, color, unit),
      location:locations(id, name, type),
      created_by_user:users!created_by(id, full_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (variant)  query = query.eq('variant_id', variant)
  if (location) query = query.eq('location_id', location)
  if (type.length > 0) query = query.in('movement_type', type)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo)   query = query.lte('created_at', dateTo)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}
