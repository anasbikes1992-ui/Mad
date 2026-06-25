import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { StockSnapshotTable } from '@/components/stock/StockSnapshotTable'

export const metadata = { title: 'Stock Snapshot' }

export default async function StockSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; category?: string }>
}) {
  const { location, category } = await searchParams
  const supabase = await createClient()

  const [locationsResult, categoriesResult, snapshotResult] = await Promise.all([
    supabase.from('locations').select('id, name, type').eq('is_active', true).order('name'),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('get_stock_snapshot', {
      p_location_ids: location ? [location] : null,
      p_category_ids: category ? [category] : null,
    }),
  ])

  return (
    <div className="flex flex-col flex-1">
      <Header title="Stock Snapshot" subtitle="Current balances across all locations" />
      <div className="flex-1 overflow-auto p-6">
        <StockSnapshotTable
          data={snapshotResult.data ?? []}
          locations={locationsResult.data ?? []}
          categories={categoriesResult.data ?? []}
          activeLocation={location}
          activeCategory={category}
        />
      </div>
    </div>
  )
}
