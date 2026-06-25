import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TransferList } from '@/components/transfers/TransferList'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export const metadata = { title: 'Transfers' }

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string }>
}) {
  const { status, location } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('transfers')
    .select(`
      id, status, approval_required, requested_at, notes,
      from_location:locations!from_location_id(id, name, type),
      to_location:locations!to_location_id(id, name, type),
      requested_by_user:users!requested_by(full_name),
      transfer_items(id, quantity_requested, unit, variant:product_variants(cost_price))
    `)
    .order('requested_at', { ascending: false })
    .limit(100)

  if (status)   query = query.eq('status', status)
  if (location) query = query.or(`from_location_id.eq.${location},to_location_id.eq.${location}`)

  type TransferRow = {
    id: string; status: string; approval_required: boolean
    requested_at: string; notes: string | null
    from_location: { id: string; name: string; type: string } | null
    to_location:   { id: string; name: string; type: string } | null
    requested_by_user: { full_name: string } | null
    transfer_items: Array<{ id: string; quantity_requested: number; unit: string; variant: { cost_price: number } | null }>
  }
  const { data: rawTransfers } = await query
  const transfers = (rawTransfers ?? []) as TransferRow[]

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Stock Transfers"
        subtitle="Inter-location stock movements"
        actions={
          <Link
            href="/transfers/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
              rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            New Transfer
          </Link>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <TransferList transfers={transfers ?? []} activeStatus={status} />
      </div>
    </div>
  )
}
