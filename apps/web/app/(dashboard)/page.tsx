import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { DashboardContent } from '@/components/dashboard/DashboardContent'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalVariants },
    { count: totalLocations },
    { data: pendingTransfers },
    { data: inTransitTransfers },
    { data: recentAudit },
    { data: lowStockItems },
  ] = await Promise.all([
    supabase.from('product_variants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('locations').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('transfers').select('id').eq('status', 'PENDING_APPROVAL'),
    supabase.from('transfers').select('id').eq('status', 'IN_TRANSIT'),
    supabase.from('audit_log').select('*').order('performed_at', { ascending: false }).limit(15),
    supabase.rpc('get_stock_snapshot').then(({ data }) =>
      ({ data: data?.filter((r: { is_low_stock: boolean }) => r.is_low_stock) ?? [] })
    ),
  ])

  return (
    <div className="flex flex-col flex-1">
      <Header title="Dashboard" subtitle="Real-time stock overview" />
      <DashboardContent
        kpis={{
          totalVariants:   totalVariants ?? 0,
          totalLocations:  totalLocations ?? 0,
          pendingApprovals: pendingTransfers?.length ?? 0,
          inTransit:       inTransitTransfers?.length ?? 0,
        }}
        recentActivity={recentAudit ?? []}
        lowStockCount={lowStockItems?.length ?? 0}
      />
    </div>
  )
}
