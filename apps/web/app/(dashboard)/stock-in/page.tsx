import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'

export const metadata = { title: 'Stock In' }

export default async function StockInPage() {
  const supabase = await createClient()

  const { data: stockIns } = await supabase
    .from('stock_ins')
    .select(`
      id, status, supplier_name, reference_no, received_date,
      location:locations(name),
      confirmed_by_user:users!confirmed_by(full_name),
      stock_in_items(quantity, cost_price)
    `)
    .order('received_date', { ascending: false })
    .limit(100)

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Stock In"
        subtitle="Goods received from suppliers"
        actions={
          <Link
            href="/stock-in/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
              rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            New Stock In
          </Link>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['Date','Supplier','Reference','Location','Items','Value (LKR)','Status',''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stockIns ?? []).map((si, i) => {
                const totalValue = (si.stock_in_items ?? []).reduce(
                  (s: number, item: { quantity: number; cost_price: number }) => s + item.quantity * item.cost_price, 0
                )
                return (
                  <tr key={si.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {format(new Date(si.received_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{si.supplier_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{si.reference_no ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {(si.location as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-center">{si.stock_in_items?.length ?? 0}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{totalValue.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        si.status === 'CONFIRMED'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                      }`}>
                        {si.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/stock-in/${si.id}`} className="text-xs text-primary hover:underline">View</Link>
                    </td>
                  </tr>
                )
              })}
              {(stockIns ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No stock-in records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
