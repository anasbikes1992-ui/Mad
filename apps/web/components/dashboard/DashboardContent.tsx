'use client'

import Link from 'next/link'
import { Package, MapPin, Clock, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { format } from 'date-fns'
import { StockMovementChart } from './StockMovementChart'

interface KPIs {
  totalVariants:    number
  totalLocations:   number
  pendingApprovals: number
  inTransit:        number
}

interface Props {
  kpis:           KPIs
  recentActivity: Array<{ id: string; table_name: string; action: string; performed_at: string; new_data: unknown }>
  lowStockCount:  number
}

const KPI_CARD = [
  { label: 'Active SKUs',        key: 'totalVariants',    icon: Package,       href: '/products',        color: 'text-primary' },
  { label: 'Locations',          key: 'totalLocations',   icon: MapPin,        href: '/locations',       color: 'text-blue-400' },
  { label: 'In Transit',         key: 'inTransit',        icon: Clock,         href: '/transfers?status=IN_TRANSIT', color: 'text-amber-400' },
  { label: 'Pending Approval',   key: 'pendingApprovals', icon: AlertTriangle, href: '/transfers?status=PENDING_APPROVAL', color: 'text-orange-400' },
] as const

function activityIcon(table: string) {
  const map: Record<string, string> = {
    transfers: '🔄',
    stock_ins: '📦',
    stock_adjustments: '⚖️',
    product_variants: '🏷️',
  }
  return map[table] ?? '📋'
}

export function DashboardContent({ kpis, recentActivity, lowStockCount }: Props) {
  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Low stock banner */}
      {lowStockCount > 0 && (
        <Link
          href="/stock/low-alerts"
          className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30
            rounded-xl text-amber-400 text-sm hover:bg-amber-500/15 transition-colors"
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span><strong>{lowStockCount} variant{lowStockCount !== 1 ? 's' : ''}</strong> are below minimum stock level</span>
          <ArrowUpRight size={14} className="ml-auto" />
        </Link>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARD.map(({ label, key, icon: Icon, href, color }) => (
          <Link
            key={key}
            href={href}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
              <Icon size={16} className={`${color} group-hover:scale-110 transition-transform`} />
            </div>
            <p className={`text-3xl font-bold ${color} font-mono`}>
              {kpis[key].toLocaleString()}
            </p>
          </Link>
        ))}
      </div>

      {/* Charts + activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stock movement chart — 2/3 width */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Stock Movement (Last 30 Days)</h2>
            <Link href="/stock/ledger" className="text-xs text-primary hover:underline">View ledger →</Link>
          </div>
          <StockMovementChart />
        </div>

        {/* Recent activity — 1/3 width */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2.5">
                <span className="text-base leading-none mt-0.5">{activityIcon(entry.table_name)}</span>
                <div className="min-w-0">
                  <p className="text-xs text-foreground capitalize leading-snug">
                    {entry.action.toLowerCase()} on {entry.table_name.replace('_', ' ')}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(entry.performed_at), 'dd MMM, HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transfer board quick links */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Transfers by Status</h2>
          <Link href="/transfers/board" className="text-xs text-primary hover:underline">Open board →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {(['DRAFT','PENDING_APPROVAL','APPROVED','IN_TRANSIT','RECEIVED'] as const).map((status) => (
            <Link
              key={status}
              href={`/transfers?status=${status}`}
              className="flex-shrink-0 px-4 py-2 bg-secondary border border-border rounded-lg text-xs
                text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              {status.replace('_', ' ')}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
