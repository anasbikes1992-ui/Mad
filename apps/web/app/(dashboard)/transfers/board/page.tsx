import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, Plus } from 'lucide-react'
import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge'

export const metadata = { title: 'Transfer Board' }

type TransferCard = {
  id:           string
  status:       string
  requested_at: string
  from_location: { name: string } | null
  to_location:   { name: string } | null
  requested_by_user: { full_name: string } | null
  transfer_items: Array<{ quantity_requested: number; variant: { cost_price: number } | null }>
}

const COLUMNS = [
  { status: 'DRAFT',            label: 'Draft',           color: 'border-slate-500/30',   header: 'bg-slate-500/10' },
  { status: 'PENDING_APPROVAL', label: 'Pending',         color: 'border-amber-500/30',   header: 'bg-amber-500/10' },
  { status: 'APPROVED',         label: 'Approved',        color: 'border-green-500/30',   header: 'bg-green-500/10' },
  { status: 'IN_TRANSIT',       label: 'In Transit',      color: 'border-blue-500/30',    header: 'bg-blue-500/10' },
  { status: 'RECEIVED',         label: 'Received',        color: 'border-emerald-500/30', header: 'bg-emerald-500/10' },
] as const

function cardValue(items: TransferCard['transfer_items']) {
  return items.reduce((s, i) => s + i.quantity_requested * (i.variant?.cost_price ?? 0), 0)
}

export default async function TransferBoardPage() {
  const supabase = await createClient()

  const { data: rawTransfers } = await supabase
    .from('transfers')
    .select(`
      id, status, requested_at,
      from_location:locations!from_location_id(name),
      to_location:locations!to_location_id(name),
      requested_by_user:users!requested_by(full_name),
      transfer_items(quantity_requested, variant:product_variants(cost_price))
    `)
    .in('status', COLUMNS.map((c) => c.status))
    .order('requested_at', { ascending: false })
    .limit(200)

  const transfers = (rawTransfers ?? []) as unknown as TransferCard[]

  const byStatus: Record<string, TransferCard[]> = {}
  for (const c of COLUMNS) byStatus[c.status] = []
  for (const t of transfers) {
    if (byStatus[t.status]) byStatus[t.status]!.push(t)
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Transfer Board"
        subtitle="Active transfers by workflow status"
        actions={
          <Link href="/transfers/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New Transfer
          </Link>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-4 h-full min-h-[600px]" style={{ minWidth: `${COLUMNS.length * 280}px` }}>
          {COLUMNS.map(({ status, label, color, header }) => {
            const col = byStatus[status] ?? []
            return (
              <div key={status} className="flex flex-col flex-1 min-w-[260px]">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl border ${color} ${header} mb-0`}>
                  <span className="text-xs font-semibold text-foreground">{label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">{col.length}</span>
                </div>

                {/* Cards */}
                <div className={`flex-1 border-x border-b ${color} rounded-b-xl p-2 space-y-2 overflow-y-auto bg-secondary/20`}>
                  {col.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                      No transfers
                    </div>
                  )}
                  {col.map((t) => (
                    <Link key={t.id} href={`/transfers/${t.id}`}
                      className="block bg-card border border-border rounded-xl p-3 hover:border-primary/40 transition-colors group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{t.id.slice(0, 8).toUpperCase()}</span>
                        <TransferStatusBadge status={t.status} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-foreground mb-2">
                        <span className="truncate font-medium">{t.from_location?.name ?? '—'}</span>
                        <ArrowRight size={11} className="text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{t.to_location?.name ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{t.requested_by_user?.full_name ?? '—'}</span>
                        <span className="font-mono text-[10px] text-primary">
                          {cardValue(t.transfer_items) > 0 ? `LKR ${cardValue(t.transfer_items).toLocaleString()}` : `${t.transfer_items.length} items`}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(t.requested_at), 'dd MMM, HH:mm')}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Link to full list */}
        <div className="mt-4 text-center">
          <Link href="/transfers" className="text-xs text-primary hover:underline">
            View all transfers including Rejected / Cancelled →
          </Link>
        </div>
      </div>
    </div>
  )
}
