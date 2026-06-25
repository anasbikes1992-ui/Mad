'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Package } from 'lucide-react'
import toast from 'react-hot-toast'

interface Category { id: string; name: string; prefix: string }

type VariantDraft = {
  id:              string
  name:            string
  color:           string
  color_hex:       string
  width_inches:    string
  gsm:             string
  unit:            string
  cost_price:      string
  selling_price:   string
  min_stock_alert: string
}

const UNITS = ['yards','meters','bales','pieces','rolls','kg']
const EMPTY_VARIANT = (): VariantDraft => ({
  id: crypto.randomUUID(), name: '', color: '', color_hex: '#C9A84C',
  width_inches: '', gsm: '', unit: 'yards', cost_price: '0', selling_price: '0', min_stock_alert: '0',
})

interface Props { categories: Category[] }

export function ProductForm({ categories }: Props) {
  const router = useRouter()
  const [name,        setName]        = useState('')
  const [slug,        setSlug]        = useState('')
  const [categoryId,  setCategoryId]  = useState(categories[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [variants,    setVariants]    = useState<VariantDraft[]>([EMPTY_VARIANT()])
  const [saving,      setSaving]      = useState(false)

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(v: string) {
    setName(v)
    setSlug(slugify(v))
  }

  function updateVariant(id: string, field: keyof VariantDraft, value: string) {
    setVariants((prev) => prev.map((v) => v.id === id ? { ...v, [field]: value } : v))
  }

  function addVariant() { setVariants((prev) => [...prev, EMPTY_VARIANT()]) }
  function removeVariant(id: string) {
    setVariants((prev) => prev.length > 1 ? prev.filter((v) => v.id !== id) : prev)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !categoryId) { toast.error('Name and category are required'); return }
    if (variants.some((v) => !v.name || !v.unit)) {
      toast.error('All variants need a name and unit'); return
    }
    setSaving(true)
    try {
      // 1. Create product
      const prodRes  = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: slug || slugify(name), category_id: categoryId, description: description || undefined, is_active: true }),
      })
      const prodJson = await prodRes.json()
      if (!prodRes.ok) throw new Error(prodJson.error?.fieldErrors ? JSON.stringify(prodJson.error.fieldErrors) : (prodJson.error ?? 'Failed to create product'))
      const productId = prodJson.data.id

      // 2. Create variants sequentially (trigger generates item_code)
      for (const v of variants) {
        const vRes  = await fetch('/api/variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id:      productId,
            name:            v.name,
            color:           v.color || undefined,
            color_hex:       v.color || v.color_hex ? v.color_hex : undefined,
            width_inches:    v.width_inches ? Number(v.width_inches) : null,
            gsm:             v.gsm           ? Number(v.gsm)           : null,
            unit:            v.unit,
            cost_price:      Number(v.cost_price)      || 0,
            selling_price:   Number(v.selling_price)   || 0,
            min_stock_alert: Number(v.min_stock_alert) || 0,
            is_active:       true,
          }),
        })
        const vJson = await vRes.json()
        if (!vRes.ok) throw new Error(vJson.error ?? 'Failed to create variant')
      }

      toast.success('Product created')
      router.push(`/products/${productId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Product info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Package size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Product Details</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Product Name *</label>
            <input
              value={name} onChange={(e) => handleNameChange(e.target.value)} required
              placeholder="e.g. Premium Cotton Shirting"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Category *</label>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.prefix})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Slug (URL-safe)</label>
            <input
              value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="auto-generated"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Description</label>
            <input
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional product description"
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Variants</h2>
          <button type="button" onClick={addVariant}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={12} /> Add Variant
          </button>
        </div>

        <div className="divide-y divide-border">
          {variants.map((v, idx) => (
            <div key={v.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Variant {idx + 1}</span>
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(v.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Variant Name *</label>
                  <input value={v.name} onChange={(e) => updateVariant(v.id, 'name', e.target.value)} required
                    placeholder="e.g. White 36 inch"
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Unit *</label>
                  <select value={v.unit} onChange={(e) => updateVariant(v.id, 'unit', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Color</label>
                  <input value={v.color} onChange={(e) => updateVariant(v.id, 'color', e.target.value)}
                    placeholder="White" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Color Hex</label>
                  <div className="flex gap-1.5">
                    <input type="color" value={v.color_hex} onChange={(e) => updateVariant(v.id, 'color_hex', e.target.value)}
                      className="w-9 h-9 rounded border border-border bg-input cursor-pointer p-0.5" />
                    <input value={v.color_hex} onChange={(e) => updateVariant(v.id, 'color_hex', e.target.value)}
                      className="flex-1 px-2 py-2 bg-input border border-border rounded-lg text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Width (inches)</label>
                  <input type="number" value={v.width_inches} onChange={(e) => updateVariant(v.id, 'width_inches', e.target.value)}
                    placeholder="36" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">GSM</label>
                  <input type="number" value={v.gsm} onChange={(e) => updateVariant(v.id, 'gsm', e.target.value)}
                    placeholder="120" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Cost Price (LKR)</label>
                  <input type="number" min="0" step="0.01" value={v.cost_price} onChange={(e) => updateVariant(v.id, 'cost_price', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Selling Price (LKR)</label>
                  <input type="number" min="0" step="0.01" value={v.selling_price} onChange={(e) => updateVariant(v.id, 'selling_price', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Min Stock Alert</label>
                  <input type="number" min="0" step="0.001" value={v.min_stock_alert} onChange={(e) => updateVariant(v.id, 'min_stock_alert', e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-5 py-2.5 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors">
          {saving ? 'Creating…' : 'Create Product'}
        </button>
      </div>
    </form>
  )
}
