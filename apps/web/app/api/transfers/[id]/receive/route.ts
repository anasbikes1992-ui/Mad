import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ReceiveSchema = z.object({
  items: z.array(z.object({
    transfer_item_id:  z.string().uuid(),
    quantity_received: z.number().min(0),
    variance_notes:    z.string().optional(),
  })).min(1),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ReceiveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: transfer } = await (supabase.from('transfers') as any)
    .select('status, to_location_id')
    .eq('id', id)
    .single()

  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  if (transfer.status !== 'IN_TRANSIT') {
    return NextResponse.json({ error: 'Transfer must be IN_TRANSIT to receive' }, { status: 400 })
  }

  // Update received quantities and variance notes
  for (const item of parsed.data.items) {
    await (supabase.from('transfer_items') as any)
      .update({
        quantity_received: item.quantity_received,
        variance_notes:    item.variance_notes ?? null,
      })
      .eq('id', item.transfer_item_id)
      .eq('transfer_id', id)
  }

  // Call DB function to write TRANSFER_IN ledger entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('receive_transfer', {
    p_transfer_id: id,
    p_user_id:     user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: updated } = await (supabase.from('transfers') as any).select('*').eq('id', id).single()
  return NextResponse.json({ data: updated })
}
