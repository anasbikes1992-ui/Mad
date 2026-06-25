'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

interface Location {
  id: string; name: string; code: string; type: string
  address: string | null; phone: string | null; manager_id: string | null; is_active: boolean
  manager?: { full_name: string; email: string } | null
}
interface Manager { id: string; full_name: string; email: string; role: string }

interface Props { locations: Location[]; managers: Manager[] }

const TYPES = ['WAREHOUSE','SHOP','SHOWROOM','OTHER']
const EMPTY = { name: '', code: '', type: 'WAREHOUSE', address: '', phone: '', manager_id: '', is_active: true }

export function LocationsManager({ locations, managers }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<string | null>(null)
  const [form,     setForm]     = useState<typeof EMPTY>(EMPTY)
  const [saving,   setSaving]   = useState(false)

  function openNew()          { setForm(EMPTY); setEditing(null); setShowForm(true) }
  function openEdit(l: Location) {
    setForm({ name: l.name, code: l.code, type: l.type, address: l.address ?? '', phone: l.phone ?? '', manager_id: l.manager_id ?? '', is_active: l.is_active })
    setEditing(l.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name || !form.code) { toast.error('Name and code are required'); return }
    setSaving(true)
    try {
      const body = { ...form, manager_id: form.manager_id || null, phone: form.phone || null, address: form.address || null }
      const url    = editing ? `/api/locations/${editing}` : '/api/locations'
      const method = editing ? 'PATCH' : 'POST'
      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success(editing ? 'Location updated' : 'Location created')
      setShowForm(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const activeCount   = locations.filter((l) => l.is_active).length
  const inactiveCount = locations.filter((l) => !l.is_active).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{activeCount}</strong> active</span>
          {inactiveCount > 0 && <span><strong className="text-foreground">{inactiveCount}</strong> inactive</span>}
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> New Location
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className={`bg-card border rounded-xl p-4 ${loc.is_active ? 'border-border' : 'border-border/40 opacity-60'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  loc.type === 'WAREHOUSE' ? 'bg-blue-500/10' : 'bg-primary/10'
                }`}>
                  <MapPin size={16} className={loc.type === 'WAREHOUSE' ? 'text-blue-400' : 'text-primary'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{loc.name}</p>
                  <p className="text-[10px] text-muted-foreground">{loc.code} · {loc.type}</p>
                </div>
              </div>
              <button onClick={() => openEdit(loc)} className="text-muted-foreground hover:text-primary transition-colors shrink-0">
                <Edit2 size={13} />
              </button>
            </div>

            {loc.address && <p className="text-xs text-muted-foreground mt-2.5 pl-11">{loc.address}</p>}
            {loc.manager && (
              <p className="text-xs text-muted-foreground mt-1 pl-11">
                Manager: <span className="text-foreground">{loc.manager.full_name}</span>
              </p>
            )}
          </div>
        ))}

        {locations.length === 0 && (
          <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">No locations configured</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-foreground">{editing ? 'Edit Location' : 'New Location'}</h3>

            {[
              { label: 'Name *', key: 'name', placeholder: 'e.g. Pettah Warehouse' },
              { label: 'Code *', key: 'code', placeholder: 'e.g. PW (unique 2-8 chars)' },
              { label: 'Address', key: 'address', placeholder: 'Street address' },
              { label: 'Phone', key: 'phone', placeholder: '+94 11 234 5678' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input
                  type="text" value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Manager</label>
              <select value={form.manager_id} onChange={(e) => setForm((p) => ({ ...p, manager_id: e.target.value }))}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option value="">— No manager —</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="rounded accent-primary" />
              Active
            </label>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-secondary rounded-lg text-sm text-muted-foreground hover:text-foreground">Cancel</button>
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
