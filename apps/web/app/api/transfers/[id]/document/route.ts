import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { TransferDocument } from '@/lib/pdf/TransferDocument'
import React from 'react'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: transfer, error } = await supabase
    .from('transfers')
    .select(`
      *,
      from_location:locations!from_location_id(*),
      to_location:locations!to_location_id(*),
      requested_by_user:users!requested_by(full_name),
      approved_by_user:users!approved_by(full_name),
      dispatched_by_user:users!dispatched_by(full_name),
      received_by_user:users!received_by(full_name),
      transfer_items(
        *, variant:product_variants(item_code, name, color, unit, cost_price)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })

  const buffer = await renderToBuffer(React.createElement(TransferDocument, { transfer: transfer as Parameters<typeof TransferDocument>[0]['transfer'] }))

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="transfer-${id.slice(0,8).toUpperCase()}.pdf"`,
    },
  })
}
