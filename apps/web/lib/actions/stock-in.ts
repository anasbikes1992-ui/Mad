'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmStockIn(stockInId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  if (!['ADMIN', 'MANAGER'].includes(me?.role ?? '')) {
    return { error: 'Only managers can confirm stock-in' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('confirm_stock_in', { p_stock_in_id: stockInId })
  if (error) return { error: error.message }

  revalidatePath('/stock-in')
  revalidatePath(`/stock-in/${stockInId}`)
  revalidatePath('/stock/snapshot')
  revalidatePath('/stock/ledger')
  return { success: true }
}
