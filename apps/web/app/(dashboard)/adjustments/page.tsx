import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

export const metadata = { title: 'Adjustments' }

type AdjRow = {
  id: string
  type: string
  status: string
  reason: string
  notes: string | null
  created_at: string
  variant: { item_code: string; name: string } | null
  location: { name: string } | null
  created_by_user: { full_name: string } | null
  confirmed_by_user: { full_name: string } | null
}

export default async function AdjustmentsPage() {
  const supabase = await createClient()

  const { data: rawAdj } = await supabase
    .from('stock_adjustments')
    .select(`
      id, type, status, reason, notes, created_at,
      variant:product_variants(item_code, name),
      location:locations(name),
      created_by_user:users!created_by(full_name),
      confirmed_by_user:users!confirmed_by(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)
  const adjustments = (rawAdj ?? []) as AdjRow[]

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Adjustments"
        subtitle="Manual stock corrections and write-offs"
        actions={
          <Link
            href="/adjustments/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
              rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            New Adjustment
          </Link>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['Date','Item','Location','Type','Reason','Status','Created By',''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adj, i) => {
                const v = adj.variant
                const l = adj.location
                const u = adj.created_by_user
                return (
                  <tr key={adj.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {format(new Date(adj.created_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-primary">{v?.item_code ?? '—'}</span>
                      <span className="text-xs text-muted-foreground ml-2">{v?.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{l?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold ${adj.type === 'IN' ? 'text-green-400' : 'text-red-400'}`}>
                        {adj.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{adj.reason}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        adj.status === 'CONFIRMED'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}>
                        {adj.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{u?.full_name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/adjustments/${adj.id}`} className="text-xs text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                )
              })}
              {adjustments.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No adjustments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
