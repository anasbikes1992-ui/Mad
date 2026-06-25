import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppNotification } from '@/lib/whatsapp/client'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: transfer } = await (supabase.from('transfers') as any)
    .select('*, transfer_items(*)')
    .eq('id', id)
    .single()

  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  if (transfer.status !== 'DRAFT') return NextResponse.json({ error: 'Only DRAFT transfers can be submitted' }, { status: 400 })

  // Check if approval is required via DB function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: approvalRequired } = await (supabase.rpc as any)('check_transfer_approval_required', {
    p_transfer_id: id,
  })

  const newStatus = approvalRequired ? 'PENDING_APPROVAL' : 'APPROVED'

  const { data, error } = await (supabase.from('transfers') as any)
    .update({
      status:           newStatus,
      approval_required: approvalRequired ?? false,
      ...(newStatus === 'APPROVED' ? { approved_by: user.id, approved_at: new Date().toISOString(), approval_notes: 'Auto-approved (below threshold)' } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify managers if pending approval
  if (newStatus === 'PENDING_APPROVAL') {
    const { data: managers } = await (supabase.from('users') as any)
      .select('id, full_name, phone')
      .in('role', ['ADMIN', 'MANAGER'])
      .eq('is_active', true)
      .not('phone', 'is', null)

    if (managers && process.env.ENABLE_WHATSAPP_NOTIFICATIONS === 'true') {
      const itemCount = transfer.transfer_items?.length ?? 0
      const { data: fromLoc } = await (supabase.from('locations') as any).select('name').eq('id', transfer.from_location_id).single()
      const { data: toLoc }   = await (supabase.from('locations') as any).select('name').eq('id', transfer.to_location_id).single()
      const { data: reqUser } = await (supabase.from('users') as any).select('full_name').eq('id', user.id).single()

      for (const manager of managers) {
        if (manager.phone) {
          await sendWhatsAppNotification({
            to: manager.phone,
            template: process.env.WHATSAPP_TRANSFER_APPROVAL_TEMPLATE!,
            params: [
              manager.full_name,
              id.slice(0, 8).toUpperCase(),
              fromLoc?.name ?? 'Unknown',
              toLoc?.name  ?? 'Unknown',
              String(itemCount),
              reqUser?.full_name ?? 'Unknown',
            ],
          })
        }
      }
    }
  }

  return NextResponse.json({ data, approvalRequired })
}
