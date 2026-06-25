import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { GRNDocument } from '@/lib/pdf/GRNDocument'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await (supabase.from('stock_ins') as any)
    .select(`
      *,
      location:locations(name),
      created_by_user:users!created_by(full_name),
      confirmed_by_user:users!confirmed_by(full_name),
      stock_in_items(quantity, cost_price, unit, variant:product_variants(id, item_code, name, color))
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const items = (data.stock_in_items ?? []).map((item: {
    quantity: number; cost_price: number; unit: string
    variant: { id: string; item_code: string; name: string; color: string | null } | null
  }) => ({
    variant_id:   item.variant?.id ?? '',
    item_code:    item.variant?.item_code ?? '',
    variant_name: item.variant?.name ?? '',
    color:        item.variant?.color ?? null,
    quantity:     item.quantity,
    unit:         item.unit,
    cost_price:   item.cost_price,
  }))

  const location = data.location as { name: string } | null
  const createdBy  = (data.created_by_user  as { full_name: string } | null)?.full_name ?? ''
  const confirmedBy = (data.confirmed_by_user as { full_name: string } | null)?.full_name ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(GRNDocument, {
    id:            data.id,
    reference_no:  data.reference_no,
    supplier_name: data.supplier_name,
    received_date: data.received_date,
    location_name: location?.name ?? '',
    notes:         data.notes,
    items,
    created_by:    createdBy,
    confirmed_by:  confirmedBy,
  }) as any)

  const refNo = data.reference_no ?? `GRN-${id.slice(0, 8).toUpperCase()}`
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${refNo}.pdf"`,
    },
  })
}
