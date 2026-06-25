'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@madeenas/ui'

interface SnapshotRow {
  variant_id: string; item_code: string; variant_name: string; product_name: string
  category_name: string; color: string | null; color_hex: string | null; unit: string
  location_id: string; location_name: string
  quantity_on_hand: number; quantity_reserved: number; quantity_available: number
  min_stock_alert: number; is_low_stock: boolean
}

interface Props {
  data:            SnapshotRow[]
  locations:       Array<{ id: string; name: string; type: string }>
  categories:      Array<{ id: string; name: string }>
  activeLocation?: string
  activeCategory?: string
}

export function StockSnapshotTable({ data, locations, categories, activeLocation, activeCategory }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [showZero, setShowZero] = useState(false)
  const [sortBy, setSortBy]     = useState<'item_code' | 'category' | 'name'>('item_code')

  function setFilter(key: string, val: string | undefined) {
    const p = new URLSearchParams(searchParams.toString())
    if (val) p.set(key, val)
    else p.delete(key)
    router.push(`/stock/snapshot?${p.toString()}`)
  }

  // Collect unique variants and locations (for pivot)
  const uniqueLocations = useMemo(() => {
    const locs = new Map<string, string>()
    data.forEach((r) => locs.set(r.location_id, r.location_name))
    return [...locs.entries()].map(([id, name]) => ({ id, name }))
  }, [data])

  const variantRows = useMemo(() => {
    const varMap = new Map<string, {
      variant_id: string; item_code: string; variant_name: string; product_name: string
      category_name: string; color: string | null; color_hex: string | null; unit: string
      balances: Record<string, { qty: number; isLow: boolean }>
    }>()

    data.forEach((r) => {
      if (!varMap.has(r.variant_id)) {
        varMap.set(r.variant_id, {
          variant_id: r.variant_id,
          item_code: r.item_code,
          variant_name: r.variant_name,
          product_name: r.product_name,
          category_name: r.category_name,
          color: r.color,
          color_hex: r.color_hex,
          unit: r.unit,
          balances: {},
        })
      }
      const v = varMap.get(r.variant_id)!
      v.balances[r.location_id] = { qty: r.quantity_available, isLow: r.is_low_stock }
    })

    let rows = [...varMap.values()]
    if (!showZero) {
      rows = rows.filter((r) => Object.values(r.balances).some((b) => b.qty > 0))
    }
    return rows.sort((a, b) => {
      if (sortBy === 'item_code') return (a.item_code ?? '').localeCompare(b.item_code ?? '')
      if (sortBy === 'category') return a.category_name.localeCompare(b.category_name)
      return a.variant_name.localeCompare(b.variant_name)
    })
  }, [data, showZero, sortBy])

  const displayLocations = activeLocation
    ? uniqueLocations.filter((l) => l.id === activeLocation)
    : uniqueLocations

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={activeCategory ?? ''}
          onChange={(e) => setFilter('category', e.target.value || undefined)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={activeLocation ?? ''}
          onChange={(e) => setFilter('location', e.target.value || undefined)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">All Locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="item_code">Sort: Item Code</option>
          <option value="category">Sort: Category</option>
          <option value="name">Sort: Name</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showZero}
            onChange={(e) => setShowZero(e.target.checked)}
            className="rounded accent-primary"
          />
          Show zero stock
        </label>

        <span className="text-xs text-muted-foreground ml-auto">
          {variantRows.length} variant{variantRows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Pivot table */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground sticky left-0 bg-secondary">Item Code</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Product</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Color</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Unit</th>
              {displayLocations.map((l) => (
                <th key={l.id} className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground min-w-[100px]">
                  {l.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variantRows.length === 0 && (
              <tr>
                <td colSpan={4 + displayLocations.length} className="text-center py-12 text-muted-foreground text-sm">
                  No stock data found
                </td>
              </tr>
            )}
            {variantRows.map((row, i) => (
              <tr key={row.variant_id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                <td className="px-4 py-2.5 font-mono text-xs text-primary sticky left-0 bg-inherit">{row.item_code ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <p className="text-foreground text-xs">{row.variant_name}</p>
                  <p className="text-muted-foreground text-[10px]">{row.product_name} · {row.category_name}</p>
                </td>
                <td className="px-4 py-2.5">
                  {row.color ? (
                    <span className="flex items-center gap-1.5">
                      {row.color_hex && <span className="w-3 h-3 rounded-full border border-border" style={{ background: row.color_hex }} />}
                      <span className="text-xs text-muted-foreground">{row.color}</span>
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.unit}</td>
                {displayLocations.map((l) => {
                  const b = row.balances[l.id]
                  const qty = b?.qty ?? 0
                  return (
                    <td key={l.id} className="px-4 py-2.5 text-right">
                      <span className={cn(
                        'font-mono text-xs font-semibold',
                        b?.isLow ? 'text-amber-400' : qty > 0 ? 'text-foreground' : 'text-muted-foreground/50'
                      )}>
                        {qty > 0 || b ? qty.toLocaleString() : '—'}
                      </span>
                      {b?.isLow && qty > 0 && (
                        <AlertTriangle size={10} className="text-amber-400 inline ml-1" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
