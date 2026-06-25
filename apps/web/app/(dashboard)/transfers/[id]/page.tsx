import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { TransferDetail } from '@/components/transfers/TransferDetail'
import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Transfer ${id.slice(0, 8).toUpperCase()}` }
}

export default async function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: transfer, error } = await supabase
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

  if (error || !transfer) notFound()

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
