import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ApproveSchema = z.object({ notes: z.string().optional() })

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only ADMIN or MANAGER can approve
  const { data: currentUser } = await (supabase.from('users') as any).select('role').eq('id', user.id).single()
  if (!currentUser || !['ADMIN','MANAGER'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { data: transfer } = await (supabase.from('transfers') as any).select('status').eq('id', id).single()
  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  if (transfer.status !== 'PENDING_APPROVAL') {
    return NextResponse.json({ error: 'Transfer is not pending approval' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const { notes } = ApproveSchema.parse(body)

  const { data, error } = await (supabase.from('transfers') as any)
    .update({
      status:         'APPROVED',
      approved_by:    user.id,
      approved_at:    new Date().toISOString(),
      approval_notes: notes,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
