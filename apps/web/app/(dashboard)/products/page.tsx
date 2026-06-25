import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { Plus, Package } from 'lucide-react'

export const metadata = { title: 'Products' }

type ProductCategoryFilter = {
  id: string
  name: string
}

type ProductRow = {
  id: string
  name: string
  slug: string
  is_active: boolean
  image_urls: string[] | null
  category: { id?: string; name: string; prefix: string } | null
  product_variants: Array<{ id: string; item_code: string | null; is_active: boolean; unit: string }> | null
}

export default async function ProductsPage({
  searchParams,
}: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select(`
      id, name, slug, is_active, image_urls,
      category:categories(id, name, prefix),
      product_variants(id, item_code, is_active, unit)
    `)
    .order('name')

  if (category) query = query.eq('category_id', category)

  const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
    query,
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
  ])

  const products = (productsData as ProductRow[] | null) ?? []
  const categories = (categoriesData as ProductCategoryFilter[] | null) ?? []

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Products"
        subtitle="Product catalogue"
        actions={
          <Link href="/products/new" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus size={14} /> New Product
          </Link>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <Link href="/products" className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!category ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
            All
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.id}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
              {c.name}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const activeVariants = p.product_variants?.filter((v: { is_active: boolean }) => v.is_active).length ?? 0
            const category_data  = p.category as { name: string; prefix: string } | null
            return (
              <Link key={p.id} href={`/products/${p.id}`}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group">
                <div className="flex items-start gap-3">
                  {p.image_urls?.[0] ? (
                    <img src={p.image_urls[0]} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center">
                      <Package size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{category_data?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeVariants} active variant{activeVariants !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {!p.is_active && (
                    <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">Inactive</span>
                  )}
                </div>
              </Link>
            )
          })}
          {products.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground text-sm">No products found</div>
          )}
        </div>
      </div>
    </div>
  )
}
