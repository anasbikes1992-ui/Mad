'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmAdjustment(adjustmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: meData } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const me = meData as { role: 'ADMIN' | 'MANAGER' | 'STORE_KEEPER' | 'VIEWER' } | null

  if (!['ADMIN', 'MANAGER'].includes(me?.role ?? '')) {
    return { error: 'Only managers can confirm adjustments' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('confirm_adjustment', { p_adjustment_id: adjustmentId })
  if (error) return { error: error.message }

  revalidatePath('/adjustments')
  revalidatePath(`/adjustments/${adjustmentId}`)
  revalidatePath('/stock/snapshot')
  revalidatePath('/stock/ledger')
  return { success: true }
}
