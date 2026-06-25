import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { SettingsForm } from '@/components/admin/SettingsForm'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  if (me?.role !== 'ADMIN') redirect('/')

  const { data: settings } = await supabase
    .from('settings')
    .select('key, value, description')
    .order('key')

  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s) => [s.key, { value: s.value, description: s.description }])
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
