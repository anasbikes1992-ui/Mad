import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { format } from 'date-fns'
import { CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { confirmAdjustment } from '@/lib/actions/adjustments'

type AdjustmentDetail = {
  id:         string
  type:       string
  status:     string
  reason:     string
  notes:      string | null
  quantity:   number
  created_at: string
  confirmed_at: string | null
  variant: {
    id:        string
    item_code: string
    name:      string
    color:     string | null
    color_hex: string | null
    unit:      string
    cost_price: number
  } | null
  location:          { name: string } | null
  created_by_user:   { full_name: string; email?: string } | null
  confirmed_by_user: { full_name: string } | null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Adjustment ${id.slice(0, 8).toUpperCase()}` }
}

export default async function AdjustmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  const { data: rawAdj, error } = await supabase
    .from('stock_adjustments')
    .select(`
      id, type, status, reason, notes, quantity, created_at, confirmed_at,
      variant:product_variants(id, item_code, name, color, color_hex, unit, cost_price),
      location:locations(name),
      created_by_user:users!created_by(full_name, email),
      confirmed_by_user:users!confirmed_by(full_name)
    `)
    .eq('id', id)
    .single()

  if (error || !rawAdj) notFound()
  const adj = rawAdj as unknown as AdjustmentDetail

  const isIN     = adj.type === 'IN'
  const canConfirm = ['ADMIN','MANAGER'].includes(me?.role ?? '') && adj.status === 'DRAFT'
  const totalValue = adj.quantity * (adj.variant?.cost_price ?? 0)

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`Adjustment ${id.slice(0, 8).toUpperCase()}`}
        subtitle={`${adj.variant?.name ?? '—'} · ${adj.location?.name ?? '—'}`}
        actions={
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isIN
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              {isIN ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {adj.type} · {adj.status}
            </span>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Type',         value: adj.type,                color: isIN ? 'text-green-400' : 'text-red-400' },
            { label: 'Status',       value: adj.status,              color: adj.status === 'CONFIRMED' ? 'text-green-400' : 'text-amber-400' },
            { label: 'Quantity',     value: `${adj.quantity} ${adj.variant?.unit ?? ''}`, color: 'text-foreground' },
            { label: 'Est. Value',   value: `LKR ${totalValue.toLocaleString()}`, color: 'text-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-sm font-semibold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Main detail card */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Item info */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Item Details</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Item Code</p>
                  <p className="font-mono text-primary">{adj.variant?.item_code ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Product Name</p>
                  <p className="text-foreground">{adj.variant?.name ?? '—'}</p>
                </div>
                {adj.variant?.color && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Color</p>
                    <div className="flex items-center gap-1.5">
                      {adj.variant.color_hex && <span className="w-3 h-3 rounded-full border border-border" style={{ background: adj.variant.color_hex }} />}
                      <p className="text-foreground text-xs">{adj.variant.color}</p>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                  <p className="text-foreground">{adj.location?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Reason</p>
                  <p className="text-foreground">{adj.reason}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                  <p className="text-foreground">{format(new Date(adj.created_at), 'dd MMM yyyy, HH:mm')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Created by</p>
                  <p className="text-foreground">{adj.created_by_user?.full_name ?? '—'}</p>
                </div>
                {adj.confirmed_by_user && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Confirmed by</p>
                    <p className="text-foreground">{adj.confirmed_by_user.full_name}</p>
                  </div>
                )}
                {adj.confirmed_at && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Confirmed at</p>
                    <p className="text-foreground">{format(new Date(adj.confirmed_at), 'dd MMM yyyy, HH:mm')}</p>
                  </div>
                )}
              </div>

              {adj.notes && (
                <div className="mt-4 p-3 bg-secondary/40 border border-border rounded-lg text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Notes: </span>{adj.notes}
                </div>
              )}
            </div>

            {/* Quantity + value visual */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Quantity Adjusted</p>
                  <p className={`text-3xl font-bold font-mono ${isIN ? 'text-green-400' : 'text-red-400'}`}>
                    {isIN ? '+' : '-'}{adj.quantity} <span className="text-lg text-muted-foreground">{adj.variant?.unit}</span>
                  </p>
                </div>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  isIN ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                }`}>
                  {isIN
                    ? <TrendingUp size={28} className="text-green-400" />
                    : <TrendingDown size={28} className="text-red-400" />
                  }
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estimated value at cost price</span>
                <span className="font-mono font-semibold text-primary">LKR {totalValue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Actions panel */}
          <div className="space-y-4">
            {canConfirm && (
              <div className="bg-card border border-emerald-500/30 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-emerald-400">Confirm Adjustment</h3>
                <p className="text-xs text-muted-foreground">
                  Confirming will apply this {isIN ? '+' : '-'}{adj.quantity} {adj.variant?.unit} change to live stock.
                  This action cannot be undone.
                </p>
                <form action={async () => {
                  'use server'
                  await confirmAdjustment(id)
                }}>
                  <button type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/15 border border-emerald-500/30
                      text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle size={14} /> Confirm & Apply
                  </button>
                </form>
              </div>
            )}

            {adj.status === 'CONFIRMED' && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <CheckCircle size={15} />
                  Applied to stock
                </div>
                {adj.confirmed_by_user && (
                  <p className="text-xs text-muted-foreground mt-1">by {adj.confirmed_by_user.full_name}</p>
                )}
              </div>
            )}

            <Link href="/adjustments"
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Adjustments
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
