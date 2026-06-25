import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProductForm } from '@/components/catalogue/ProductForm'

export const metadata = { title: 'New Product' }

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: string } | null

  if (!['ADMIN', 'MANAGER'].includes(me?.role ?? '')) redirect('/products')

  const { data: catsData } = await supabase
    .from('categories')
    .select('id, name, prefix')
    .eq('is_active', true)
    .order('name')

  type Cat = { id: string; name: string; prefix: string }
  const categories = (catsData as Cat[] | null) ?? []

  return (
    <div className="flex flex-col flex-1">
      <Header title="New Product" subtitle="Create a product and its initial variants" />
      <div className="flex-1 overflow-auto p-6">
        <ProductForm categories={categories} />
      </div>
    </div>
  )
}
