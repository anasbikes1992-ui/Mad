import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProductDetail } from '@/components/catalogue/ProductDetail'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('name').eq('id', id).single()
  return { title: (data as { name: string } | null)?.name ?? 'Product' }
}

type StockBalance = {
  location_id:        string
  quantity_on_hand:   number
  quantity_available: number
  quantity_reserved:  number
  location: { name: string } | null
}

type Variant = {
  id: string; item_code: string | null; name: string; color: string | null; color_hex: string | null
  width_inches: number | null; gsm: number | null; unit: string; cost_price: number; selling_price: number
  min_stock_alert: number; barcode: string | null; is_active: boolean; material: string | null
  stock_balances: StockBalance[]
}

type Product = {
  id: string; name: string; slug: string; description: string | null; is_active: boolean
  category: { id: string; name: string; prefix: string } | null
  product_variants: Variant[]
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: rawProduct }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('products')
      .select(`
        id, name, slug, description, is_active,
        category:categories(id, name, prefix),
        product_variants(
          id, item_code, name, color, color_hex, width_inches, gsm,
          unit, cost_price, selling_price, min_stock_alert, barcode, is_active, material,
          stock_balances(location_id, quantity_on_hand, quantity_available, quantity_reserved,
            location:locations(name)
          )
        )
      `)
      .eq('id', id)
      .single(),
  ])

  if (!rawProduct) notFound()

  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: string } | null
  const product = rawProduct as unknown as Product

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={product.name}
        subtitle={`${product.category?.name ?? ''} · ${product.product_variants.length} variant${product.product_variants.length !== 1 ? 's' : ''}`}
        actions={
          <Link href="/products" className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={13} /> Back
          </Link>
        }
      />
      <div className="flex-1 overflow-auto p-6">
        <ProductDetail product={product} userRole={me?.role ?? 'VIEWER'} />
      </div>
    </div>
  )
}
