'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface SettingEntry { value: string; description: string | null }
interface Props { initialSettings: Record<string, SettingEntry> }

const SETTING_GROUPS = [
  {
    title: 'Approval Thresholds',
    keys: [
      { key: 'approval_qty_threshold',   label: 'Quantity Threshold',   hint: 'Min quantity requiring manager approval', type: 'number' },
      { key: 'approval_value_threshold', label: 'Value Threshold (LKR)', hint: 'Min value requiring manager approval',    type: 'number' },
    ],
  },
  {
    title: 'WhatsApp Notifications',
    keys: [
      { key: 'whatsapp_enabled',              label: 'Enable WhatsApp',           hint: 'Send notifications via WhatsApp Cloud API', type: 'boolean' },
      { key: 'whatsapp_approval_template',    label: 'Approval Template Name',    hint: 'Meta approved template for approval requests', type: 'text' },
      { key: 'whatsapp_low_stock_template',   label: 'Low Stock Template Name',   hint: 'Meta approved template for low stock alerts',  type: 'text' },
    ],
  },
  {
    title: 'Currency & Tax',
    keys: [
      { key: 'currency',     label: 'Currency',   hint: 'ISO currency code',     type: 'text' },
      { key: 'vat_rate',     label: 'VAT Rate %', hint: 'Applied to sell prices', type: 'number' },
    ],
  },
]

export function SettingsForm({ initialSettings }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(initialSettings).map(([k, v]) => [k, v.value]))
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const updates = Object.entries(values).map(([key, value]) => ({ key, value }))
      const res  = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      toast.success('Settings saved')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {SETTING_GROUPS.map((group) => (
        <div key={group.title} className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-secondary/30">
            <h2 className="text-sm font-semibold text-foreground">{group.title}</h2>
          </div>
          <div className="divide-y divide-border">
            {group.keys.map(({ key, label, hint, type }) => {
              const val = values[key] ?? initialSettings[key]?.value ?? ''
              const desc = initialSettings[key]?.description ?? hint
              return (
                <div key={key} className="px-5 py-4 flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
                  </div>
                  <div className="shrink-0">
                    {type === 'boolean' ? (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={val === 'true'}
                          onChange={(e) => setValues((p) => ({ ...p, [key]: String(e.target.checked) }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-input peer-focus:outline-none rounded-full peer
                          peer-checked:after:translate-x-full peer-checked:after:border-white
                          after:content-[''] after:absolute after:top-[2px] after:start-[2px]
                          after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                          peer-checked:bg-primary border border-border" />
                      </label>
                    ) : (
                      <input
                        type={type === 'number' ? 'number' : 'text'}
                        value={val}
                        onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-40 px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground text-right
                          focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold
            hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}
