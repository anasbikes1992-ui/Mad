import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const locationIds = searchParams.getAll('location')
  const categoryIds = searchParams.getAll('category')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_stock_snapshot', {
    p_location_ids: locationIds.length > 0 ? locationIds : null,
    p_category_ids: categoryIds.length > 0 ? categoryIds : null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
