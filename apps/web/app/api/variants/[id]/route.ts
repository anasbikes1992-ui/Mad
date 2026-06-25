import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select(`*, product:products(name, category:categories(name, prefix)), stock_balances(*, location:locations(name))`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()

  if (!['ADMIN','MANAGER'].includes(me?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('product_variants')
    .update({
      name: body.name, color: body.color, color_hex: body.color_hex,
      unit: body.unit, width_cm: body.width_cm, weight_gsm: body.weight_gsm,
      cost_price: body.cost_price, sell_price: body.sell_price,
      min_stock_alert: body.min_stock_alert, barcode: body.barcode, is_active: body.is_active,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()

  if (me?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { data: balances } = await supabase
    .from('stock_balances')
    .select('quantity_on_hand')
    .eq('variant_id', id)

  const hasStock = (balances ?? []).some((b: { quantity_on_hand: number }) => b.quantity_on_hand > 0)
  if (hasStock) {
    return NextResponse.json({ error: 'Cannot delete variant with stock on hand' }, { status: 400 })
  }

  const { error } = await supabase.from('product_variants').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
