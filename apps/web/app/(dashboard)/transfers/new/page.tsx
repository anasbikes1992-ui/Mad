import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CreateTransferForm } from '@/components/transfers/CreateTransferForm'

export const metadata = { title: 'New Transfer' }

export default async function NewTransferPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUserData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const currentUser = currentUserData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  let locationsQuery = supabase.from('locations').select('id, name, type').eq('is_active', true).order('name')

  // Store keepers only see their assigned locations
  if (currentUser?.role === 'STORE_KEEPER') {
    const { data: userLocsData } = await supabase.from('user_locations').select('location_id').eq('user_id', user?.id ?? '')
    const userLocs = userLocsData as Array<{ location_id: string }> | null
    const locationIds = userLocs?.map((ul) => ul.location_id) ?? []
    locationsQuery = locationsQuery.in('id', locationIds) as typeof locationsQuery
  }

  const { data: locations } = await locationsQuery

  return (
    <div className="flex flex-col flex-1">
      <Header title="New Transfer" subtitle="Create an inter-location stock transfer" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <CreateTransferForm locations={locations ?? []} />
        </div>
      </div>
    </div>
  )
}
