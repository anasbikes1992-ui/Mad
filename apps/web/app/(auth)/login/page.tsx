'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { toast.error('Enter your email first'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (error) throw error
      setMagicLinkSent(true)
      toast.success('Magic link sent — check your email')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 8h24M4 16h24M4 24h16" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="26" cy="24" r="4" fill="#C9A84C"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Madeenas Stock</h1>
          <p className="text-muted-foreground text-sm mt-1">Textile Inventory Management</p>
        </div>

        {magicLinkSent ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Check your email</h2>
            <p className="text-muted-foreground text-sm">
              We sent a magic link to <span className="text-primary font-medium">{email}</span>.<br />
              Click it to sign in instantly.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="mt-6 text-sm text-primary hover:underline"
            >
              Back to login
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@madeenas.lk"
                  required
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                    focus:border-primary transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-foreground
                    placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50
                    focus:border-primary transition-colors text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm
                  hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-card px-3">or</span>
              </div>
            </div>

            <button
              onClick={handleMagicLink}
              disabled={loading}
              className="w-full py-2.5 bg-secondary text-foreground rounded-lg font-medium text-sm
                hover:bg-secondary/80 disabled:opacity-50 transition-colors border border-border"
            >
              Send magic link
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Madeenas Textiles · Colombo, Sri Lanka
        </p>
      </div>
    </div>
  )
}
