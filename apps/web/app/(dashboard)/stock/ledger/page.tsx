import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { format } from 'date-fns'

export const metadata = { title: 'Stock Ledger' }

const MOVEMENT_COLORS: Record<string, string> = {
  STOCK_IN:    'text-green-400',
  TRANSFER_OUT: 'text-red-400',
  TRANSFER_IN:  'text-blue-400',
  ADJUSTMENT_IN:  'text-amber-400',
  ADJUSTMENT_OUT: 'text-orange-400',
  OPENING:     'text-muted-foreground',
}

export default async function StockLedgerPage({
  searchParams,
}: { searchParams: Promise<{ location?: string; from?: string; to?: string; type?: string }> }) {
  const { location, from, to, type } = await searchParams
  const supabase = await createClient()

  type LedgerRow = {
    id: string; movement_type: string; quantity_change: number
    quantity_after: number; reference_type: string | null
    reference_id: string | null; notes: string | null; created_at: string
    variant: { item_code: string; name: string } | null
    location: { name: string } | null
  }
  type LocationOption = { id: string; name: string }
  let query = supabase
    .from('stock_ledger')
    .select(`
      id, movement_type, quantity_change, quantity_after, reference_type, reference_id, notes, created_at,
      variant:product_variants(item_code, name),
      location:locations(name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (location) query = query.eq('location_id', location)
  if (from)     query = query.gte('created_at', from)
  if (to)       query = query.lte('created_at', to + 'T23:59:59')
  if (type)     query = query.eq('movement_type', type)

  const [{ data: rawLedger }, { data: locationsData }] = await Promise.all([
    query,
    supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
  ])
  const ledger = (rawLedger ?? []) as LedgerRow[]
  const locations = (locationsData ?? []) as LocationOption[]

  return (
    <div className="flex flex-col flex-1">
      <Header title="Stock Ledger" subtitle="Append-only movement history" />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Filters */}
        <form className="flex flex-wrap gap-3" method="get">
          <select name="location" defaultValue={location ?? ''} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option value="">All Locations</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select name="type" defaultValue={type ?? ''} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option value="">All Types</option>
            {['STOCK_IN','TRANSFER_OUT','TRANSFER_IN','ADJUSTMENT_IN','ADJUSTMENT_OUT','OPENING'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={from ?? ''} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input type="date" name="to"   defaultValue={to   ?? ''} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            Apply
          </button>
        </form>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['Date','Item Code','Name','Location','Type','Change','Balance','Notes'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.map((row, i) => {
                const v = row.variant
                const l = row.location
                const colorClass = MOVEMENT_COLORS[row.movement_type] ?? 'text-foreground'
                return (
                  <tr key={row.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(row.created_at), 'dd MMM yy HH:mm')}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-primary">{v?.item_code ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{v?.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l?.name}</td>
                    <td className={`px-4 py-2.5 text-xs font-semibold ${colorClass}`}>{row.movement_type}</td>
                    <td className={`px-4 py-2.5 font-mono text-xs font-bold ${row.quantity_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {row.quantity_change >= 0 ? '+' : ''}{row.quantity_change}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground">{row.quantity_after}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[160px] truncate">{row.notes ?? '—'}</td>
                  </tr>
                )
              })}
              {ledger.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No ledger entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
