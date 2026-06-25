import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StockInForm } from '@/components/stock/StockInForm'

export const metadata = { title: 'New Stock In' }

export default async function NewStockInPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUserData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const currentUser = currentUserData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  let locQuery = supabase.from('locations').select('id, name, type').eq('is_active', true).order('name')
  if (currentUser?.role === 'STORE_KEEPER') {
    const { data: ulData } = await supabase.from('user_locations').select('location_id').eq('user_id', user?.id ?? '')
    const ul = ulData as Array<{ location_id: string }> | null
    const ids = ul?.map((x) => x.location_id) ?? []
    locQuery = locQuery.in('id', ids) as typeof locQuery
  }

  const { data: locations } = await locQuery

  return (
    <div className="flex flex-col flex-1">
      <Header title="New Stock In" subtitle="Record goods received from supplier" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          <StockInForm locations={locations ?? []} />
        </div>
      </div>
    </div>
  )
}
