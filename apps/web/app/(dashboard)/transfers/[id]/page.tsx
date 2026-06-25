import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { TransferDetail } from '@/components/transfers/TransferDetail'
import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge'

type VariantRef = { id: string; item_code: string; name: string; color: string | null; color_hex: string | null; unit: string; cost_price: number; selling_price: number; product: { name: string } | null }
type LocationRef = { id: string; name: string; type: string; address: string | null }
type UserRef = { id: string; full_name: string; email?: string }
type TransferItemFull = { id: string; transfer_id: string; variant_id: string; quantity_requested: number; quantity_dispatched: number | null; quantity_received: number | null; unit: string; variance_notes: string | null; variant: VariantRef | null }
type TransferFull = {
  id: string; status: string; approval_required: boolean; approval_notes: string | null
  from_location_id: string; to_location_id: string
  requested_by: string | null; approved_by: string | null; dispatched_by: string | null; received_by: string | null
  requested_at: string; approved_at: string | null; dispatched_at: string | null; received_at: string | null
  notes: string | null
  from_location:      LocationRef | null
  to_location:        LocationRef | null
  requested_by_user:  UserRef | null
  approved_by_user:   UserRef | null
  dispatched_by_user: UserRef | null
  received_by_user:   UserRef | null
  transfer_items:     TransferItemFull[]
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Transfer ${id.slice(0, 8).toUpperCase()}` }
}

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: rawTransfer, error } = await supabase
    .from('transfers')
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
          product:products(name)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !rawTransfer) notFound()
  const transfer = rawTransfer as unknown as TransferFull

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUserData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const currentUser = currentUserData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  let userLocationIds: string[] = []
  if (currentUser?.role === 'STORE_KEEPER') {
    const { data: ulData } = await supabase.from('user_locations').select('location_id').eq('user_id', user?.id ?? '')
    const ul = ulData as Array<{ location_id: string }> | null
    userLocationIds = ul?.map((x) => x.location_id) ?? []
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`Transfer ${id.slice(0, 8).toUpperCase()}`}
        subtitle={`${transfer.from_location?.name} → ${transfer.to_location?.name}`}
        actions={<TransferStatusBadge status={transfer.status} />}
      />
      <div className="flex-1 overflow-auto p-6">
        <TransferDetail
          transfer={transfer as Parameters<typeof TransferDetail>[0]['transfer']}
          userRole={currentUser?.role ?? 'VIEWER'}
          userLocationIds={userLocationIds}
        />
      </div>
    </div>
  )
}
