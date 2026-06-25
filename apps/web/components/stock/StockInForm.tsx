'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface Location { id: string; name: string; type: string }
interface Variant { id: string; item_code: string; name: string; color: string | null; unit: string; cost_price: number }
interface LineItem { variant: Variant; quantity: number; cost_price: number }

export function StockInForm({ locations }: { locations: Location[] }) {
  const router  = useRouter()
  const supabase = createClient()

  const [locationId,    setLocationId]    = useState('')
  const [supplierName,  setSupplierName]  = useState('')
  const [referenceNo,   setReferenceNo]   = useState('')
  const [receivedDate,  setReceivedDate]  = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes,         setNotes]         = useState('')
  const [items,         setItems]         = useState<LineItem[]>([])
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<Variant[]>([])
  const [submitting,    setSubmitting]    = useState(false)

  async function doSearch(q: string) {
    if (q.length < 2) return
    const { data } = await supabase
      .from('product_variants')
      .select('id, item_code, name, color, unit, cost_price')
      .eq('is_active', true)
      .or(`item_code.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(10)
    setSearchResults((data as Variant[]) ?? [])
  }

  function addItem(v: Variant) {
    if (items.find((i) => i.variant.id === v.id)) { toast('Already added'); return }
    setItems((prev) => [...prev, { variant: v, quantity: 1, cost_price: v.cost_price }])
    setSearchQuery('')
    setSearchResults([])
  }

  async function handleSubmit(confirm: boolean) {
    if (!locationId)    { toast.error('Select a location'); return }
    if (!supplierName)  { toast.error('Enter supplier name'); return }
    if (items.length === 0) { toast.error('Add at least one item'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/stock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id:   locationId,
          supplier_name: supplierName,
          reference_no:  referenceNo || undefined,
          received_date: receivedDate,
          notes:         notes || undefined,
          items: items.map((i) => ({
            variant_id: i.variant.id,
            quantity:   i.quantity,
            unit:       i.variant.unit,
            cost_price: i.cost_price,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')

      const id = json.data.id

      if (confirm) {
        const cRes = await fetch(`/api/stock-in/${id}/confirm`, { method: 'POST' })
        const cJson = await cRes.json()
        if (!cRes.ok) throw new Error(cJson.error ?? 'Failed to confirm')
        toast.success('Stock In confirmed and ledger updated')
      } else {
        toast.success('Stock In saved as draft')
      }

      router.push(`/stock-in/${id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const totalValue = items.reduce((s, i) => s + i.quantity * i.cost_price, 0)

  return (
    <div className="space-y-5">
      {/* Header fields */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">GRN Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Receiving Location *</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Select location…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Received Date *</label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Supplier Name *</label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Colombo Textiles Ltd"
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">PO / GRN Reference</label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. PO-2024-001"
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any delivery notes or remarks…"
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
              placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Items</h2>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); doSearch(e.target.value) }}
            placeholder="Search variant by item code or name…"
            className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
              placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            {searchResults.map((v) => (
              <button
                key={v.id}
                onClick={() => addItem(v)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary
                  border-b border-border last:border-0 text-left transition-colors"
              >
                <div>
                  <span className="font-mono text-xs text-primary">{v.item_code}</span>
                  <span className="text-sm text-foreground ml-2">{v.name}</span>
                  {v.color && <span className="text-xs text-muted-foreground ml-1">· {v.color}</span>}
                </div>
                <span className="text-xs text-muted-foreground font-mono">LKR {v.cost_price.toLocaleString()}/{v.unit}</span>
              </button>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                {['Item Code','Name','Quantity','Unit','Cost Price (LKR)','Total',''].map((h) => (
                  <th key={h} className="text-left py-2 text-xs text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.variant.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                  <td className="py-2.5 font-mono text-xs text-primary">{item.variant.item_code}</td>
                  <td className="py-2.5 text-foreground">{item.variant.name}</td>
                  <td className="py-2.5">
                    <input
                      type="number" min={0.01} step={0.01}
                      value={item.quantity}
                      onChange={(e) => setItems((prev) => prev.map((p) =>
                        p.variant.id === item.variant.id ? { ...p, quantity: Number(e.target.value) } : p
                      ))}
                      className="w-20 px-2 py-1 bg-input border border-border rounded text-sm font-mono text-right
                        focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">{item.variant.unit}</td>
                  <td className="py-2.5">
                    <input
                      type="number" min={0} step={0.01}
                      value={item.cost_price}
                      onChange={(e) => setItems((prev) => prev.map((p) =>
                        p.variant.id === item.variant.id ? { ...p, cost_price: Number(e.target.value) } : p
                      ))}
                      className="w-28 px-2 py-1 bg-input border border-border rounded text-sm font-mono text-right
                        focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </td>
                  <td className="py-2.5 font-mono text-xs text-foreground">
                    {(item.quantity * item.cost_price).toLocaleString()}
                  </td>
                  <td className="py-2.5">
                    <button onClick={() => setItems((p) => p.filter((x) => x.variant.id !== item.variant.id))}>
                      <X size={14} className="text-muted-foreground hover:text-red-400 transition-colors" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="py-2 text-right text-xs font-semibold text-muted-foreground">Total Value</td>
                <td className="py-2 font-mono text-primary font-bold">LKR {totalValue.toLocaleString()}</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="px-5 py-2.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground
            hover:text-foreground disabled:opacity-40 transition-colors"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold
            hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Processing…' : 'Confirm Stock In'}
        </button>
      </div>
    </div>
  )
}
