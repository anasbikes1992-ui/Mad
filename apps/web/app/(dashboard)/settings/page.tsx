import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const metadata = { title: 'Settings' }

type SettingsRow = {
  key: string
  value: unknown
  description: string | null
}

const toSettingString = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  if (me?.role !== 'ADMIN') redirect('/')

  const { data: settingsData } = await supabase
    .from('settings')
    .select('key, value, description')
    .order('key')

  const settings = (settingsData as SettingsRow[] | null) ?? []

  const settingsMap = Object.fromEntries(
    settings.map((s) => [s.key, { value: toSettingString(s.value), description: s.description }])
  )

  return (
    <div className="flex flex-col flex-1">
      <Header title="Settings" subtitle="System configuration and thresholds" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <SettingsForm initialSettings={settingsMap} />
        </div>
      </div>
    </div>
  )
}
