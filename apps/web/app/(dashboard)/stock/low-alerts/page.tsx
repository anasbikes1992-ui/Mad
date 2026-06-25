import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Low Stock Alerts' }

type AlertRow = {
  variant_id:         string
  item_code:          string
  variant_name:       string
  unit:               string
  location_id:        string
  location_name:      string
  quantity_available: number
  min_stock_alert:    number
}

export default async function LowAlertsPage() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_low_stock_alerts')
  const rows: AlertRow[] = data ?? []

  return (
    <div className="flex flex-col flex-1">
      <Header title="Low Stock Alerts" subtitle="Items at or below minimum stock threshold" />
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20 bg-amber-500/5 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">
              {rows.length} item{rows.length !== 1 ? 's' : ''} below minimum
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['Item Code','Name','Location','Available','Minimum','Deficit','Unit'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.variant_id}-${row.location_id}`} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                  <td className="px-4 py-2.5">
                    <Link href={`/products?search=${row.item_code}`} className="font-mono text-xs text-primary hover:underline">
                      {row.item_code}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-foreground">{row.variant_name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.location_name}</td>
                  <td className="px-4 py-2.5 font-mono text-amber-400 font-bold">{row.quantity_available}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.min_stock_alert}</td>
                  <td className="px-4 py-2.5 font-mono text-red-400 font-bold">
                    {row.min_stock_alert - row.quantity_available}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.unit}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                    All stock levels are healthy
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
