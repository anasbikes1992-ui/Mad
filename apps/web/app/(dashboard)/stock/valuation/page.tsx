import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { TrendingUp } from 'lucide-react'

export const metadata = { title: 'Stock Valuation' }

export default async function ValuationPage() {
  const supabase = await createClient()

  const { data } = await supabase.rpc('get_stock_valuation')

  type ValRow = {
    category_name: string
    variant_count: number
    total_quantity: number
    total_cost_value: number
    total_sell_value: number
  }

  const rows: ValRow[] = data ?? []
  const grandCost = rows.reduce((s, r) => s + r.total_cost_value, 0)
  const grandSell = rows.reduce((s, r) => s + r.total_sell_value, 0)

  return (
    <div className="flex flex-col flex-1">
      <Header title="Stock Valuation" subtitle="Inventory value by category" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Cost Value', value: grandCost, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
            { label: 'Total Sell Value', value: grandSell, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
            { label: 'Gross Margin', value: grandSell - grandCost, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
          ].map((card) => (
            <div key={card.label} className={`${card.bg} border rounded-xl p-4`}>
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className={`text-xl font-bold ${card.color} font-mono`}>
                LKR {card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Breakdown table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['Category','Variants','Total Qty','Cost Value (LKR)','Sell Value (LKR)','Margin (LKR)','Margin %'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const margin = row.total_sell_value - row.total_cost_value
                const marginPct = row.total_sell_value > 0 ? (margin / row.total_sell_value * 100) : 0
                return (
                  <tr key={row.category_name} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                    <td className="px-4 py-2.5 text-sm font-medium text-foreground">{row.category_name}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{row.variant_count}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{row.total_quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{row.total_cost_value.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-foreground">{row.total_sell_value.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-green-400">{margin.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-primary">{marginPct.toFixed(1)}%</td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">No valuation data</td></tr>
              )}
              {rows.length > 0 && (
                <tr className="border-t-2 border-border bg-secondary/50">
                  <td className="px-4 py-3 text-sm font-bold text-foreground">Total</td>
                  <td colSpan={2} />
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{grandCost.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{grandSell.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono font-bold text-green-400">{(grandSell - grandCost).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    {grandSell > 0 ? ((grandSell - grandCost) / grandSell * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
