import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { UsersManager } from '@/components/admin/UsersManager'

export const metadata = { title: 'Users' }

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()

  if (me?.role !== 'ADMIN') redirect('/')

  const [{ data: users }, { data: locations }] = await Promise.all([
    supabase
      .from('users')
      .select('*, user_locations(location_id, location:locations(name))')
      .order('full_name'),
    supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div className="flex flex-col flex-1">
      <Header title="Users" subtitle="Team members and access control" />
      <div className="flex-1 overflow-auto p-6">
        <UsersManager users={users ?? []} locations={locations ?? []} />
      </div>
    </div>
  )
}
