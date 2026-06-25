import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const DispatchSchema = z.object({
  items: z.array(z.object({
    transfer_item_id:   z.string().uuid(),
    quantity_dispatched: z.number().positive(),
  })).min(1),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = DispatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: transfer } = await supabase
    .from('transfers')
    .select('status, from_location_id')
    .eq('id', id)
    .single()

  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  if (transfer.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Transfer must be APPROVED before dispatch' }, { status: 400 })
  }

  // Verify user has access to source location
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', authUser?.id ?? '').single()

  if (currentUser?.role === 'STORE_KEEPER') {
    const { data: userLoc } = await supabase
      .from('user_locations')
      .select('location_id')
      .eq('user_id', user.id)
      .eq('location_id', transfer.from_location_id)
      .single()
    if (!userLoc) return NextResponse.json({ error: 'Not assigned to source location' }, { status: 403 })
  }

  // Update quantities dispatched on transfer items
  for (const item of parsed.data.items) {
    await supabase
      .from('transfer_items')
      .update({ quantity_dispatched: item.quantity_dispatched })
      .eq('id', item.transfer_item_id)
      .eq('transfer_id', id)
  }

  // Call DB function to write ledger entries and flip status
  const { error } = await supabase.rpc('dispatch_transfer', {
    p_transfer_id: id,
    p_user_id:     user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: updated } = await supabase.from('transfers').select('*').eq('id', id).single()
  return NextResponse.json({ data: updated })
}
