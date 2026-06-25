import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(id, name, prefix, slug),
      product_variants(
        *,
        stock_balances(location_id, quantity_on_hand, quantity_available, location:locations(name))
      )
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const body = await request.json()
  const { data, error } = await (supabase.from('products') as any).update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: variants } = await supabase.from('product_variants').select('id').eq('product_id', id).limit(1)
  if (variants && variants.length > 0) {
    return NextResponse.json({ error: 'Cannot delete: product has variants. Deactivate instead.' }, { status: 400 })
  }

  const { error } = await (supabase.from('products') as any).update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
