import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const RejectSchema = z.object({ notes: z.string().min(1, 'Rejection reason required') })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentUser } = await (supabase.from('users') as any).select('role').eq('id', user.id).single()
  if (!currentUser || !['ADMIN','MANAGER'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = RejectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data: transfer } = await (supabase.from('transfers') as any).select('status').eq('id', id).single()
  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  if (transfer.status !== 'PENDING_APPROVAL') {
    return NextResponse.json({ error: 'Transfer is not pending approval' }, { status: 400 })
  }

  const { data, error } = await (supabase.from('transfers') as any)
    .update({
      status:         'REJECTED',
      rejected_by:    user.id,
      rejected_at:    new Date().toISOString(),
      approval_notes: parsed.data.notes,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
