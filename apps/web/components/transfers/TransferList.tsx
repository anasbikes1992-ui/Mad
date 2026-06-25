'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, Clock } from 'lucide-react'
import { TransferStatusBadge } from './TransferStatusBadge'

type Transfer = {
  id: string
  status: string
  approval_required: boolean
  requested_at: string
  notes: string | null
  from_location: { id: string; name: string; type: string } | null
  to_location:   { id: string; name: string; type: string } | null
  requested_by_user: { full_name: string } | null
  transfer_items: Array<{ id: string; quantity_requested: number; unit: string; variant: { cost_price: number } | null }>
}

const STATUS_FILTERS = [
  { label: 'All',             value: undefined },
  { label: 'Draft',           value: 'DRAFT' },
  { label: 'Pending',         value: 'PENDING_APPROVAL' },
  { label: 'Approved',        value: 'APPROVED' },
  { label: 'In Transit',      value: 'IN_TRANSIT' },
  { label: 'Received',        value: 'RECEIVED' },
  { label: 'Rejected',        value: 'REJECTED' },
  { label: 'Cancelled',       value: 'CANCELLED' },
] as const

function totalValue(items: Transfer['transfer_items']) {
  return items.reduce((s, i) => s + i.quantity_requested * (i.variant?.cost_price ?? 0), 0)
}

interface Props {
  transfers: Transfer[]
  activeStatus?: string
}

export function TransferList({ transfers, activeStatus }: Props) {
  return (
    <div className="space-y-4">
      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/transfers?status=${value}` : '/transfers'}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeStatus === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Transfer cards */}
      {transfers.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No transfers found
        </div>
      )}

      <div className="space-y-2">
        {transfers.map((t) => (
          <Link
            key={t.id}
            href={`/transfers/${t.id}`}
            className="flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4
              hover:border-primary/40 transition-colors group"
          >
            {/* ID + status */}
            <div className="min-w-0 shrink-0">
              <p className="font-mono text-xs text-muted-foreground">{t.id.slice(0, 8).toUpperCase()}</p>
              <TransferStatusBadge status={t.status} className="mt-1" />
            </div>

            {/* Route */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-sm text-foreground font-medium truncate">
                {t.from_location?.name ?? '—'}
              </span>
              <ArrowRight size={14} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground font-medium truncate">
                {t.to_location?.name ?? '—'}
              </span>
            </div>

            {/* Item count + value */}
            <div className="text-right shrink-0 hidden sm:block">
              <p className="text-sm font-mono text-foreground">
                LKR {totalValue(t.transfer_items).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.transfer_items.length} item{t.transfer_items.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Date + requester */}
            <div className="text-right shrink-0 hidden md:block">
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                <Clock size={11} />
                {format(new Date(t.requested_at), 'dd MMM, HH:mm')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.requested_by_user?.full_name ?? '—'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
