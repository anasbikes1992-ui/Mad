'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, ChevronRight, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

interface Category {
  id: string; name: string; slug: string; prefix: string
  description: string | null; image_url: string | null
  parent_id: string | null; sort_order: number; is_active: boolean
  products?: Array<{ id: string }>
}

interface Props { initialCategories: Category[] }

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const EMPTY_FORM = { name: '', slug: '', prefix: '', description: '', parent_id: '', is_active: true }

export function CategoriesManager({ initialCategories }: Props) {
  const router    = useRouter()
  const [showForm, setShowForm]   = useState(false)
  const [editing,  setEditing]    = useState<string | null>(null)
  const [form,     setForm]       = useState(EMPTY_FORM)
  const [saving,   setSaving]     = useState(false)

  const rootCats = initialCategories.filter((c) => !c.parent_id)
  const childMap  = new Map<string, Category[]>()
  initialCategories.filter((c) => c.parent_id).forEach((c) => {
    const ch = childMap.get(c.parent_id!) ?? []
    ch.push(c)
    childMap.set(c.parent_id!, ch)
  })

  function openNew() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, slug: cat.slug, prefix: cat.prefix, description: cat.description ?? '', parent_id: cat.parent_id ?? '', is_active: cat.is_active })
    setEditing(cat.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.prefix) { toast.error('Name and prefix are required'); return }
    setSaving(true)
    try {
      const body = { ...form, slug: form.slug || slugify(form.name), parent_id: form.parent_id || null }
      const url    = editing ? `/api/categories/${editing}` : '/api/categories'
      const method = editing ? 'PATCH' : 'POST'
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success(editing ? 'Category updated' : 'Category created')
      setShowForm(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  function CategoryRow({ cat, depth = 0 }: { cat: Category; depth?: number }) {
    const children = childMap.get(cat.id) ?? []
    return (
      <>
        <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {depth > 0 && <ChevronRight size={12} className="text-muted-foreground shrink-0" />}
              <Tag size={14} className="text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium">{cat.name}</span>
              {!cat.is_active && (
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">Inactive</span>
              )}
            </div>
          </td>
          <td className="px-4 py-3 font-mono text-xs text-primary">{cat.prefix}</td>
          <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{cat.slug}</td>
          <td className="px-4 py-3 text-xs text-muted-foreground">{cat.products?.length ?? 0} products</td>
          <td className="px-4 py-3">
            <button onClick={() => openEdit(cat)} className="text-muted-foreground hover:text-primary transition-colors">
              <Edit2 size={13} />
            </button>
          </td>
        </tr>
        {children.map((child) => <CategoryRow key={child.id} cat={child} depth={depth + 1} />)}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New Category
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary border-b border-border">
            <tr>
              {['Category','Prefix','Slug','Products',''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rootCats.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
            {rootCats.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No categories yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-foreground">{editing ? 'Edit Category' : 'New Category'}</h3>

            {[
              { label: 'Name *', key: 'name', placeholder: 'e.g. Shirting' },
              { label: 'Slug *', key: 'slug', placeholder: 'e.g. shirting (auto-generated)' },
              { label: 'Prefix * (2-5 chars)', key: 'prefix', placeholder: 'e.g. SHT' },
              { label: 'Description', key: 'description', placeholder: 'Optional description' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input
                  type="text"
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Parent Category</label>
              <select
                value={form.parent_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground
                  focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="">— Root category —</option>
                {initialCategories.filter((c) => c.id !== editing).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded accent-primary" />
              Active
            </label>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-secondary rounded-lg text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-40">
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
