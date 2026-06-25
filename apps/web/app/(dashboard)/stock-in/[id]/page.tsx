import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { format } from 'date-fns'
import Link from 'next/link'
import { FileText, CheckCircle } from 'lucide-react'
import { confirmStockIn } from '@/lib/actions/stock-in'

export default async function StockInDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()

  const { data, error } = await supabase
    .from('stock_ins')
    .select(`
      *,
      location:locations(name),
      created_by_user:users!created_by(full_name, email),
      confirmed_by_user:users!confirmed_by(full_name),
      stock_in_items(*, variant:product_variants(id, item_code, name, color, unit))
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const location   = data.location    as { name: string } | null
  const createdBy  = data.created_by_user  as { full_name: string } | null
  const confirmedBy = data.confirmed_by_user as { full_name: string } | null
  const totalValue  = (data.stock_in_items ?? []).reduce(
    (s: number, i: { quantity: number; cost_price: number }) => s + i.quantity * i.cost_price, 0
  )

  const canConfirm = ['ADMIN','MANAGER'].includes(me?.role ?? '') && data.status === 'DRAFT'

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={data.reference_no ?? `GRN-${id.slice(0, 8).toUpperCase()}`}
        subtitle={`${data.supplier_name} · ${format(new Date(data.received_date), 'dd MMM yyyy')}`}
        actions={
          <div className="flex gap-2">
            <a href={`/api/stock-in/${id}/grn`} target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              <FileText size={14} /> Download GRN
            </a>
            {canConfirm && (
              <form action={confirmStockIn.bind(null, id)}>
                <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 border border-green-500/30 rounded-lg text-sm text-green-400 hover:bg-green-500/20 transition-colors">
                  <CheckCircle size={14} /> Confirm Stock In
                </button>
              </form>
            )}
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Info cards */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Status', value: data.status },
            { label: 'Location', value: location?.name ?? '—' },
            { label: 'Created by', value: createdBy?.full_name ?? '—' },
            { label: 'Confirmed by', value: confirmedBy?.full_name ?? 'Pending' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-sm font-semibold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {data.notes && (
          <div className="bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Notes: </span>{data.notes}
          </div>
        )}

        {/* Items table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex justify-between items-center">
            <h2 className="text-sm font-semibold text-foreground">Received Items</h2>
            <span className="font-mono text-xs text-muted-foreground">Total: LKR {totalValue.toLocaleString()}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['Item Code','Name','Color','Qty','Unit','Cost Price (LKR)','Total (LKR)'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.stock_in_items ?? []).map((item: {
                id: string; quantity: number; cost_price: number; unit: string
                variant: { item_code: string; name: string; color: string | null } | null
              }, i: number) => (
                <tr key={item.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-primary">{item.variant?.item_code ?? '—'}</td>
                  <td className="px-4 py-2.5 text-foreground">{item.variant?.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.variant?.color ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.unit}</td>
                  <td className="px-4 py-2.5 font-mono">{item.cost_price.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono font-medium text-foreground">{(item.quantity * item.cost_price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
