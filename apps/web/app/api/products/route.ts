import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ProductSchema = z.object({
  category_id: z.string().uuid(),
  name:        z.string().min(1),
  slug:        z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  image_urls:  z.array(z.string()).default([]),
  is_active:   z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const active   = searchParams.get('active')
  const limit    = Number(searchParams.get('limit') ?? '100')

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, prefix),
      product_variants(id, item_code, name, color, unit, is_active, cost_price, selling_price)
    `, { count: 'exact' })
    .order('name')
    .limit(limit)

  if (category) query = query.eq('category_id', category)
  if (active !== null) query = query.eq('is_active', active === 'true')

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ProductSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await (supabase.from('products') as any)
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
