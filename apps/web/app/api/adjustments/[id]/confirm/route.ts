import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!currentUser || !['ADMIN','MANAGER'].includes(currentUser.role)) {
    return NextResponse.json({ error: 'Only MANAGER or ADMIN can confirm adjustments' }, { status: 403 })
  }

  const { error } = await supabase.rpc('confirm_adjustment', {
    p_adjustment_id: id,
    p_user_id:       user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: updated } = await supabase.from('stock_adjustments').select('*').eq('id', id).single()
  return NextResponse.json({ data: updated })
}
