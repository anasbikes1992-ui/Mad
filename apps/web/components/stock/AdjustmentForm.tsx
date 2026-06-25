'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Location { id: string; name: string; type: string }
interface Variant  { id: string; item_code: string; name: string; unit: string }

const TYPES   = ['IN','OUT'] as const
const REASONS = ['DAMAGE','EXPIRY','COUNT_CORRECTION','OPENING_STOCK','THEFT','RETURN','OTHER']

export function AdjustmentForm({ locations }: { locations: Location[] }) {
  const router   = useRouter()
  const supabase = createClient()

  const [locationId,    setLocationId]    = useState('')
  const [type,          setType]          = useState<'IN'|'OUT'>('OUT')
  const [reason,        setReason]        = useState('DAMAGE')
  const [notes,         setNotes]         = useState('')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<Variant[]>([])
  const [variant,       setVariant]       = useState<Variant | null>(null)
  const [quantity,      setQuantity]      = useState(1)
  const [submitting,    setSubmitting]    = useState(false)

  async function doSearch(q: string) {
    if (q.length < 2) return
    const { data } = await supabase
      .from('product_variants')
      .select('id, item_code, name, unit')
      .eq('is_active', true)
      .or(`item_code.ilike.%${q}%,name.ilike.%${q}%`)
      .limit(8)
    setSearchResults(data ?? [])
  }

  async function handleSubmit() {
    if (!locationId) { toast.error('Select a location'); return }
    if (!variant)    { toast.error('Select a variant'); return }
    if (quantity <= 0) { toast.error('Quantity must be greater than 0'); return }

    setSubmitting(true)
    try {
      const res  = await fetch('/api/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: locationId,
          variant_id:  variant.id,
          type, reason,
          quantity,
          unit:  variant.unit,
          notes: notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Adjustment created — pending manager confirmation')
      router.push('/adjustments')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">Location *</label>
        <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
          className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
          <option value="">Select location…</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Type */}
      <div className="grid grid-cols-2 gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              type === t
                ? t === 'IN' ? 'bg-green-500/15 border-green-500/30 text-green-400' : 'bg-red-500/15 border-red-500/30 text-red-400'
                : 'bg-secondary border-border text-muted-foreground'
            }`}
          >
            {t === 'IN' ? '+ Stock In' : '− Stock Out'}
          </button>
        ))}
      </div>

      {/* Variant search */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">Variant *</label>
        {variant ? (
          <div className="flex items-center justify-between px-3 py-2.5 bg-secondary border border-border rounded-lg">
            <span>
              <span className="font-mono text-xs text-primary mr-2">{variant.item_code}</span>
              <span className="text-sm text-foreground">{variant.name}</span>
            </span>
            <button onClick={() => setVariant(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text" value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); doSearch(e.target.value) }}
                placeholder="Search item code or name…"
                className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden">
                {searchResults.map((v) => (
                  <button key={v.id} onClick={() => { setVariant(v); setSearchQuery(''); setSearchResults([]) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-secondary border-b border-border last:border-0 text-left">
                    <span className="font-mono text-xs text-primary">{v.item_code}</span>
                    <span className="text-sm text-foreground">{v.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{v.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quantity */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Quantity *</label>
          <input type="number" min={0.01} step={0.01} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground font-mono text-right focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
            {REASONS.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Describe the reason…"
          className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50" />
      </div>

      <button onClick={handleSubmit} disabled={submitting}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors">
        {submitting ? 'Submitting…' : 'Create Adjustment'}
      </button>
    </div>
  )
}
