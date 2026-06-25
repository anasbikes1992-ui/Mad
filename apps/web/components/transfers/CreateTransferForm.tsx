'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Plus, ArrowRight, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Location { id: string; name: string; type: string }
interface Variant {
  id: string; item_code: string; name: string; color: string | null
  unit: string; cost_price: number
  stock_balances: Array<{ location_id: string; quantity_available: number }>
}
interface TransferLineItem {
  variant:    Variant
  quantity:   number
  available:  number
}

interface Props { locations: Location[] }

export function CreateTransferForm({ locations }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]               = useState<1 | 2 | 3>(1)
  const [fromId, setFromId]           = useState('')
  const [toId, setToId]               = useState('')
  const [notes, setNotes]             = useState('')
  const [items, setItems]             = useState<TransferLineItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Variant[]>([])
  const [searching, setSearching]     = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  async function doSearch(q: string) {
    if (q.length < 2 || !fromId) return
    setSearching(true)
    const { data } = await supabase
      .from('product_variants')
      .select('id, item_code, name, color, unit, cost_price, stock_balances(location_id, quantity_available)')
      .eq('is_active', true)
      .or(`item_code.ilike.%${q}%,name.ilike.%${q}%,color.ilike.%${q}%`)
      .limit(12)
    setSearchResults((data as Variant[]) ?? [])
    setSearching(false)
  }

  const getAvailable = useCallback((v: Variant) => {
    return v.stock_balances.find((b) => b.location_id === fromId)?.quantity_available ?? 0
  }, [fromId])

  function addItem(variant: Variant) {
    if (items.find((i) => i.variant.id === variant.id)) {
      toast('Already added')
      return
    }
    const available = getAvailable(variant)
    setItems((prev) => [...prev, { variant, quantity: Math.min(1, available), available }])
    setSearchQuery('')
    setSearchResults([])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.variant.id !== id))
  }

  function updateQty(id: string, qty: number) {
    setItems((prev) => prev.map((i) =>
      i.variant.id === id ? { ...i, quantity: Math.max(0, Math.min(qty, i.available)) } : i
    ))
  }

  async function handleSubmit(asDraft: boolean) {
    if (!fromId || !toId) { toast.error('Select both locations'); return }
    if (items.length === 0) { toast.error('Add at least one item'); return }
    if (items.some((i) => i.quantity <= 0)) { toast.error('All quantities must be > 0'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_location_id: fromId,
          to_location_id:   toId,
          notes,
          items: items.map((i) => ({
            variant_id: i.variant.id,
            quantity_requested: i.quantity,
            unit: i.variant.unit,
          })),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create transfer')

      const transferId = json.data.id

      if (!asDraft) {
        const submitRes = await fetch(`/api/transfers/${transferId}/submit`, { method: 'POST' })
        const submitJson = await submitRes.json()
        if (!submitRes.ok) throw new Error(submitJson.error ?? 'Failed to submit')
        toast.success(submitJson.approvalRequired ? 'Transfer submitted for approval' : 'Transfer auto-approved')
      } else {
        toast.success('Transfer saved as draft')
      }

      router.push(`/transfers/${transferId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const fromLocation = locations.find((l) => l.id === fromId)
  const toLocation   = locations.find((l) => l.id === toId)
  const totalValue   = items.reduce((s, i) => s + i.quantity * i.variant.cost_price, 0)

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1,2,3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s ? 'bg-primary text-primary-foreground' :
              step > s  ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              'bg-secondary text-muted-foreground border border-border'
            }`}>{s}</div>
            <span className={`text-sm ${step === s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {s === 1 ? 'Locations' : s === 2 ? 'Items' : 'Review'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Locations */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Select Locations</h2>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">From (Source)</label>
            <select
              value={fromId}
              onChange={(e) => { setFromId(e.target.value); setItems([]) }}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select source location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">To (Destination)</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select destination location…</option>
              {locations.filter((l) => l.id !== fromId).map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any remarks about this transfer…"
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!fromId || !toId}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold
              hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            Next: Add Items <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-foreground">{fromLocation?.name}</span>
              <ArrowRight size={12} className="text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{toLocation?.name}</span>
            </div>

            {/* Search bar */}
            <div className="relative mt-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); doSearch(e.target.value) }}
                placeholder="Search by item code, name or colour…"
                className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground
                  placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-border rounded-lg overflow-hidden">
                {searchResults.map((v) => {
                  const avail = getAvailable(v)
                  return (
                    <button
                      key={v.id}
                      onClick={() => addItem(v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary
                        transition-colors border-b border-border last:border-0 text-left"
                    >
                      <div>
                        <span className="font-mono text-xs text-primary">{v.item_code}</span>
                        <span className="text-sm text-foreground ml-2">{v.name}</span>
                        {v.color && <span className="text-xs text-muted-foreground ml-1">· {v.color}</span>}
                      </div>
                      <span className={`text-xs font-mono ${avail > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {avail} {v.unit}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
            {searching && <p className="text-xs text-muted-foreground mt-2 px-1">Searching…</p>}
          </div>

          {/* Item rows */}
          {items.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    {['Item Code','Name','Color','Available','Transfer Qty','Unit',''].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.variant.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-secondary/30' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-primary">{item.variant.item_code}</td>
                      <td className="px-4 py-2.5 text-foreground">{item.variant.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{item.variant.color ?? '—'}</td>
                      <td className={`px-4 py-2.5 font-mono ${item.available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.available}
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          min={0}
                          max={item.available}
                          value={item.quantity}
                          onChange={(e) => updateQty(item.variant.id, Number(e.target.value))}
                          className="w-24 px-2 py-1 bg-input border border-border rounded text-sm text-foreground
                            font-mono text-right focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        {item.quantity > item.available && (
                          <AlertCircle size={12} className="text-red-400 inline ml-1" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{item.variant.unit}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => removeItem(item.variant.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={items.length === 0}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold
                hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Review Transfer <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Review Transfer</h2>

            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              <span className="text-sm font-medium text-foreground">{fromLocation?.name}</span>
              <ArrowRight size={14} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{toLocation?.name}</span>
            </div>

            {notes && <p className="text-xs text-muted-foreground italic">{notes}</p>}

            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  {['Item Code','Name','Qty','Unit','Value (LKR)'].map((h) => (
                    <th key={h} className="text-left py-2 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.variant.id} className="border-b border-border/50">
                    <td className="py-2.5 font-mono text-xs text-primary">{item.variant.item_code}</td>
                    <td className="py-2.5 text-foreground">{item.variant.name}</td>
                    <td className="py-2.5 font-mono text-foreground">{item.quantity}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{item.variant.unit}</td>
                    <td className="py-2.5 font-mono text-foreground">
                      {(item.quantity * item.variant.cost_price).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="py-2 text-right text-xs font-semibold text-muted-foreground">Total</td>
                  <td className="py-2 font-mono text-primary font-bold">LKR {totalValue.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {totalValue >= 200000 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-400">
                <AlertCircle size={12} />
                Value exceeds LKR 200,000 — manager approval will be required
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground">
              Back
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground
                hover:border-primary/40 disabled:opacity-40"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold
                hover:bg-primary/90 disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
