'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitTransfer(transferId: string) {
  const supabase = await createClient()

  const { data: transfer } = await (supabase.from('transfers') as any)
    .select('status')
    .eq('id', transferId)
    .single()

  if (transfer?.status !== 'DRAFT') {
    return { error: 'Transfer is not in DRAFT status' }
  }

  const { error } = await (supabase.from('transfers') as any)
    .update({ status: 'PENDING_APPROVAL' })
    .eq('id', transferId)

  if (error) return { error: error.message }

  revalidatePath('/transfers')
  revalidatePath(`/transfers/${transferId}`)
  return { success: true }
}

export async function cancelTransfer(transferId: string) {
  const supabase = await createClient()

  const { error } = await (supabase.from('transfers') as any)
    .update({ status: 'CANCELLED' })
    .eq('id', transferId)
    .in('status', ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'])

  if (error) return { error: error.message }

  revalidatePath('/transfers')
  revalidatePath(`/transfers/${transferId}`)
  return { success: true }
}
