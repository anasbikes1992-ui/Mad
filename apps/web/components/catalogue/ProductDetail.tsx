'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Check, X, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const UNITS = ['yards','meters','bales','pieces','rolls','kg']

type StockBalance = { location_id: string; quantity_on_hand: number; quantity_available: number; quantity_reserved: number; location: { name: string } | null }
type Variant = {
  id: string; item_code: string | null; name: string; color: string | null; color_hex: string | null
  width_inches: number | null; gsm: number | null; unit: string; cost_price: number; selling_price: number
  min_stock_alert: number; barcode: string | null; is_active: boolean; material: string | null
  stock_balances: StockBalance[]
}
type Product = {
  id: string; name: string; slug: string; description: string | null; is_active: boolean
  category: { id: string; name: string; prefix: string } | null
  product_variants: Variant[]
}

interface Props { product: Product; userRole: string }

const EMPTY_V = {
  name: '', color: '', color_hex: '#C9A84C', width_inches: '', gsm: '',
  unit: 'yards', cost_price: '0', selling_price: '0', min_stock_alert: '0',
}

export function ProductDetail({ product, userRole }: Props) {
  const router = useRouter()
  const canEdit = ['ADMIN','MANAGER'].includes(userRole)

  // Product edit state
  const [editingProduct, setEditingProduct] = useState(false)
  const [prodName,  setProdName]  = useState(product.name)
  const [prodDesc,  setProdDesc]  = useState(product.description ?? '')
  const [prodActive, setProdActive] = useState(product.is_active)
  const [savingProd, setSavingProd] = useState(false)

  // Variant add state
  const [showAddVariant, setShowAddVariant] = useState(false)
  const [newV, setNewV] = useState<typeof EMPTY_V>(EMPTY_V)
  const [savingV, setSavingV] = useState(false)

  // Variant edit state
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null)
  const [editV, setEditV] = useState<Partial<Variant>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  async function saveProduct() {
    setSavingProd(true)
    try {
      const res  = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prodName, description: prodDesc || null, is_active: prodActive }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Product updated')
      setEditingProduct(false)
      router.refresh()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setSavingProd(false) }
  }

  async function addVariant() {
    if (!newV.name) { toast.error('Variant name required'); return }
    setSavingV(true)
    try {
      const res  = await fetch('/api/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id, name: newV.name,
          color: newV.color || undefined, color_hex: newV.color ? newV.color_hex : undefined,
          width_inches: newV.width_inches ? Number(newV.width_inches) : null,
          gsm: newV.gsm ? Number(newV.gsm) : null,
          unit: newV.unit,
          cost_price:      Number(newV.cost_price)      || 0,
          selling_price:   Number(newV.selling_price)   || 0,
          min_stock_alert: Number(newV.min_stock_alert) || 0,
          is_active: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Variant added — item code generated')
      setShowAddVariant(false)
      setNewV(EMPTY_V)
      router.refresh()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setSavingV(false) }
  }

  async function saveVariant() {
    if (!editingVariant) return
    setSavingEdit(true)
    try {
      const res  = await fetch(`/api/variants/${editingVariant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editV),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Variant updated')
      setEditingVariant(null)
      router.refresh()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
    finally { setSavingEdit(false) }
  }

  function openEditVariant(v: Variant) {
    setEditingVariant(v)
    setEditV({
      name: v.name, color: v.color ?? '', color_hex: v.color_hex ?? '',
      width_inches: v.width_inches ?? undefined, gsm: v.gsm ?? undefined,
      unit: v.unit, cost_price: v.cost_price, selling_price: v.selling_price,
      min_stock_alert: v.min_stock_alert, barcode: v.barcode ?? '', is_active: v.is_active,
    })
  }

  const totalStock = (v: Variant) =>
    v.stock_balances.reduce((s, b) => s + b.quantity_on_hand, 0)

  const input = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'

  return (
    <div className="space-y-6">
      {/* Product header card */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Package size={20} className="text-primary" />
            </div>
            {editingProduct ? (
              <div className="space-y-2">
                <input value={prodName} onChange={(e) => setProdName(e.target.value)}
                  className="px-3 py-1.5 bg-input border border-border rounded-lg text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-72" />
                <input value={prodDesc} onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Description" className="px-3 py-1.5 bg-input border border-border rounded-lg text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-72" />
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input type="checkbox" checked={prodActive} onChange={(e) => setProdActive(e.target.checked)} className="accent-primary" />
                  Active
                </label>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">{product.name}</h2>
                  {!product.is_active && <span className="text-[10px] px-1.5 py-0.5 bg-secondary border border-border rounded text-muted-foreground">Inactive</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{product.category?.name} · {product.category?.prefix}</p>
                {product.description && <p className="text-xs text-muted-foreground mt-1">{product.description}</p>}
              </div>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2 shrink-0">
              {editingProduct ? (
                <>
                  <button onClick={() => setEditingProduct(false)} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  <button onClick={saveProduct} disabled={savingProd}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-40">
                    <Check size={12} />{savingProd ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditingProduct(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Variants table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Variants <span className="text-muted-foreground font-normal text-xs ml-1">({product.product_variants.length})</span>
          </h2>
          {canEdit && (
            <button onClick={() => setShowAddVariant(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
              <Plus size={12} /> Add Variant
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b border-border">
              <tr>
                {['Item Code','Name','Color','Width','GSM','Unit','Cost (LKR)','Sell (LKR)','Stock','Min Alert','Status',''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {product.product_variants.map((v, i) => (
                <tr key={v.id} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''} ${!v.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-primary whitespace-nowrap">{v.item_code ?? '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-foreground">{v.name}</td>
                  <td className="px-4 py-2.5">
                    {v.color ? (
                      <span className="flex items-center gap-1.5">
                        {v.color_hex && <span className="w-3 h-3 rounded-full border border-border inline-block" style={{ background: v.color_hex }} />}
                        <span className="text-xs text-muted-foreground">{v.color}</span>
                      </span>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.width_inches ? `${v.width_inches}"` : '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.gsm ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{v.unit}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{v.cost_price.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-green-400">{v.selling_price.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    <span className={totalStock(v) > 0 ? 'text-foreground' : 'text-muted-foreground'}>
                      {totalStock(v).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.min_stock_alert}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${v.is_active ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-secondary text-muted-foreground border-border'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {canEdit && (
                      <button onClick={() => openEditVariant(v)}
                        className="text-muted-foreground hover:text-primary transition-colors">
                        <Edit2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {product.product_variants.length === 0 && (
                <tr><td colSpan={12} className="text-center py-12 text-muted-foreground text-sm">No variants yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock per location (all variants) */}
      {product.product_variants.some((v) => v.stock_balances.length > 0) && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Stock by Location</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary border-b border-border">
                <tr>
                  {['Variant','Location','On Hand','Reserved','Available'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {product.product_variants.flatMap((v) =>
                  v.stock_balances.map((b, i) => (
                    <tr key={`${v.id}-${b.location_id}`} className={`border-b border-border/50 ${i % 2 === 1 ? 'bg-secondary/20' : ''}`}>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs text-primary">{v.item_code ?? '—'}</span>
                        <span className="text-xs text-muted-foreground ml-2">{v.name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{b.location?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-foreground">{b.quantity_on_hand.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                      <td className="px-4 py-2.5 font-mono text-amber-400">{b.quantity_reserved.toLocaleString(undefined, { maximumFractionDigits: 3 })}</td>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${b.quantity_available <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {b.quantity_available.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add variant modal */}
      {showAddVariant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-foreground">Add Variant</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Name *</label>
                <input value={newV.name} onChange={(e) => setNewV((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. White 36 inch" className={input} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Unit *</label>
                <select value={newV.unit} onChange={(e) => setNewV((p) => ({ ...p, unit: e.target.value }))}
                  className={input}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Color</label>
                <input value={newV.color} onChange={(e) => setNewV((p) => ({ ...p, color: e.target.value }))}
                  placeholder="White" className={input} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Width (inches)</label>
                <input type="number" value={newV.width_inches} onChange={(e) => setNewV((p) => ({ ...p, width_inches: e.target.value }))}
                  placeholder="36" className={input} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">GSM</label>
                <input type="number" value={newV.gsm} onChange={(e) => setNewV((p) => ({ ...p, gsm: e.target.value }))}
                  placeholder="120" className={input} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cost Price (LKR)</label>
                <input type="number" min="0" step="0.01" value={newV.cost_price} onChange={(e) => setNewV((p) => ({ ...p, cost_price: e.target.value }))}
                  className={`${input} font-mono`} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Selling Price (LKR)</label>
                <input type="number" min="0" step="0.01" value={newV.selling_price} onChange={(e) => setNewV((p) => ({ ...p, selling_price: e.target.value }))}
                  className={`${input} font-mono`} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min Stock Alert</label>
                <input type="number" min="0" step="0.001" value={newV.min_stock_alert} onChange={(e) => setNewV((p) => ({ ...p, min_stock_alert: e.target.value }))}
                  className={`${input} font-mono`} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddVariant(false)} className="flex-1 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">Cancel</button>
              <button onClick={addVariant} disabled={savingV}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-40">
                {savingV ? 'Adding…' : 'Add Variant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit variant modal */}
      {editingVariant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-semibold text-foreground">Edit Variant</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{editingVariant.item_code}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Name *</label>
                <input value={editV.name ?? ''} onChange={(e) => setEditV((p) => ({ ...p, name: e.target.value }))}
                  className={input} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Unit</label>
                <select value={editV.unit ?? 'yards'} onChange={(e) => setEditV((p) => ({ ...p, unit: e.target.value }))}
                  className={input}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Color</label>
                <input value={editV.color ?? ''} onChange={(e) => setEditV((p) => ({ ...p, color: e.target.value }))}
                  className={input} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cost Price (LKR)</label>
                <input type="number" min="0" step="0.01" value={editV.cost_price ?? 0} onChange={(e) => setEditV((p) => ({ ...p, cost_price: Number(e.target.value) }))}
                  className={`${input} font-mono`} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Selling Price (LKR)</label>
                <input type="number" min="0" step="0.01" value={editV.selling_price ?? 0} onChange={(e) => setEditV((p) => ({ ...p, selling_price: Number(e.target.value) }))}
                  className={`${input} font-mono`} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min Stock Alert</label>
                <input type="number" min="0" step="0.001" value={editV.min_stock_alert ?? 0} onChange={(e) => setEditV((p) => ({ ...p, min_stock_alert: Number(e.target.value) }))}
                  className={`${input} font-mono`} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Barcode</label>
                <input value={editV.barcode ?? ''} onChange={(e) => setEditV((p) => ({ ...p, barcode: e.target.value || null }))}
                  placeholder="Optional" className={input} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={editV.is_active ?? true} onChange={(e) => setEditV((p) => ({ ...p, is_active: e.target.checked }))} className="accent-primary" />
              Active
            </label>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingVariant(null)} className="flex-1 py-2 bg-secondary rounded-lg text-sm text-muted-foreground">Cancel</button>
              <button onClick={saveVariant} disabled={savingEdit}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-40">
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
