import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await (supabase.from('transfers') as any)
    .select(`
      *,
      from_location:locations!from_location_id(id, name, type, address),
      to_location:locations!to_location_id(id, name, type, address),
      requested_by_user:users!requested_by(id, full_name, email),
      approved_by_user:users!approved_by(id, full_name),
      dispatched_by_user:users!dispatched_by(id, full_name),
      received_by_user:users!received_by(id, full_name),
      transfer_items(
        *,
        variant:product_variants(
          id, item_code, name, color, color_hex, unit, cost_price, selling_price,
          product:products(name, category:categories(name, prefix))
        )
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

  const { data: transfer } = await (supabase.from('transfers') as any).select('status').eq('id', id).single()
  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  if (transfer.status !== 'DRAFT') return NextResponse.json({ error: 'Only DRAFT transfers can be edited' }, { status: 400 })

  const body = await request.json()
  const { notes } = body

  const { data, error } = await (supabase.from('transfers') as any)
    .update({ notes })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
