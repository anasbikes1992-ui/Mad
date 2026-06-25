import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { LocationsManager } from '@/components/admin/LocationsManager'

export const metadata = { title: 'Locations' }

export default async function LocationsPage() {
  const supabase = await createClient()

  const [{ data: locations }, { data: users }] = await Promise.all([
    supabase
      .from('locations')
      .select('*, manager:users!manager_id(full_name, email)')
      .order('name'),
    supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('is_active', true)
      .in('role', ['MANAGER','ADMIN'])
      .order('full_name'),
  ])

  return (
    <div className="flex flex-col flex-1">
      <Header title="Locations" subtitle="Warehouses, shops, and storage points" />
      <div className="flex-1 overflow-auto p-6">
        <LocationsManager locations={locations ?? []} managers={users ?? []} />
      </div>
    </div>
  )
}
