import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { normalizeSupabaseEnvValue } from '@/lib/supabase/env'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
  const isPublicRoute = isAuthRoute || request.nextUrl.pathname.startsWith('/api/health')

  const url = normalizeSupabaseEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const anonKey = normalizeSupabaseEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (!url || !anonKey) {
    if (isPublicRoute) return NextResponse.next()
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
