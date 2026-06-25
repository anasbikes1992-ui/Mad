import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CategorySchema = z.object({
  name:        z.string().min(1),
  slug:        z.string().min(1).regex(/^[a-z0-9-]+$/),
  prefix:      z.string().min(2).max(5).toUpperCase(),
  description: z.string().optional(),
  image_url:   z.string().url().optional().nullable(),
  parent_id:   z.string().uuid().optional().nullable(),
  sort_order:  z.number().int().default(0),
  is_active:   z.boolean().default(true),
})

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CategorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await (supabase.from('categories') as any).insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
