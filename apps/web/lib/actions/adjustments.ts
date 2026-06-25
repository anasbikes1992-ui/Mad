'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function confirmAdjustment(adjustmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()

  if (!['ADMIN', 'MANAGER'].includes(me?.role ?? '')) {
    return { error: 'Only managers can confirm adjustments' }
  }

  const { error } = await supabase.rpc('confirm_adjustment', { p_adjustment_id: adjustmentId })
  if (error) return { error: error.message }

  revalidatePath('/adjustments')
  revalidatePath(`/adjustments/${adjustmentId}`)
  revalidatePath('/stock/snapshot')
  revalidatePath('/stock/ledger')
  return { success: true }
}
