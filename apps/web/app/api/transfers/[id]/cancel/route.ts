import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CANCELLABLE = ['DRAFT','PENDING_APPROVAL','APPROVED'] as const

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: transfer } = await (supabase.from('transfers') as any).select('status').eq('id', id).single()
  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  if (!(CANCELLABLE as readonly string[]).includes(transfer.status)) {
    return NextResponse.json({ error: `Cannot cancel a transfer with status: ${transfer.status}` }, { status: 400 })
  }

  const { data, error } = await (supabase.from('transfers') as any)
    .update({
      status:       'CANCELLED',
      cancelled_by: user.id,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
