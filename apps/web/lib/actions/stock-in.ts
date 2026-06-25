'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmStockIn(stockInId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()

  if (!['ADMIN', 'MANAGER'].includes(me?.role ?? '')) {
    return { error: 'Only managers can confirm stock-in' }
  }

  const { error } = await supabase.rpc('confirm_stock_in', { p_stock_in_id: stockInId })
  if (error) return { error: error.message }

  revalidatePath('/stock-in')
  revalidatePath(`/stock-in/${stockInId}`)
  revalidatePath('/stock/snapshot')
  revalidatePath('/stock/ledger')
  return { success: true }
}
