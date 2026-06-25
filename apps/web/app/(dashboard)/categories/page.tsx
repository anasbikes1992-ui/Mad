import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { CategoriesManager } from '@/components/catalogue/CategoriesManager'

export const metadata = { title: 'Categories' }

export default async function CategoriesPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*, products(id)')
    .order('sort_order')
    .order('name')

  return (
    <div className="flex flex-col flex-1">
      <Header title="Categories" subtitle="Product catalogue hierarchy" />
      <div className="flex-1 overflow-auto p-6">
        <CategoriesManager initialCategories={categories ?? []} />
      </div>
    </div>
  )
}
