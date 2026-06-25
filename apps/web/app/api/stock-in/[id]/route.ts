import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stock_ins')
    .select(`
      *,
      location:locations(*),
      created_by_user:users!created_by(full_name, email),
      confirmed_by_user:users!confirmed_by(full_name),
      stock_in_items(*, variant:product_variants(item_code, name, unit, color))
    `)
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
  const body = await req.json()

  const { data: existing } = await supabase.from('stock_ins').select('status').eq('id', id).single()
  if (existing?.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT stock-ins can be edited' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stock_ins')
    .update({ notes: body.notes, supplier_name: body.supplier_name, reference_no: body.reference_no })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
