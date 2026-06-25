import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { AdjustmentForm } from '@/components/stock/AdjustmentForm'

export const metadata = { title: 'New Adjustment' }

export default async function NewAdjustmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()

  let locQuery = supabase.from('locations').select('id, name, type').eq('is_active', true).order('name')
  if (me?.role === 'STORE_KEEPER') {
    const { data: ul } = await supabase.from('user_locations').select('location_id').eq('user_id', user?.id ?? '')
    const ids = ul?.map((x) => x.location_id) ?? []
    locQuery = locQuery.in('id', ids) as typeof locQuery
  }
  const { data: locations } = await locQuery

  return (
    <div className="flex flex-col flex-1">
      <Header title="New Adjustment" subtitle="Manual stock correction or write-off" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-xl mx-auto">
          <AdjustmentForm locations={locations ?? []} />
        </div>
      </div>
    </div>
  )
}
