'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabaseRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  useEffect(() => {
    const supabase = createBrowserClient()
    supabaseRef.current = supabase

    // For /auth/extension, use full page navigation so the content script injects
    const navigate = (path) => {
      if (path.startsWith('/auth/extension')) {
        window.location.href = path
      } else {
        router.push(path)
      }
    }

    // If already logged in, redirect
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) navigate(redirectTo)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) navigate(redirectTo)
    })
  }, [router, redirectTo])

  const handleGoogle = () => {
    const supabase = supabaseRef.current
    if (!supabase) return
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback?next=' + encodeURIComponent(redirectTo) }
    })
  }

  const handleSignIn = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabaseRef.current.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError(err.message)
  }

  const handleSignUp = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabaseRef.current.auth.signUp({ email, password })
    setLoading(false)
    if (err) setError(err.message)
    else setError('Check your email to confirm!')
  }

  return (
    <div className="bg-vs-bg min-h-screen flex items-center justify-center px-6">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(76,215,246,0.04) 0%, transparent 60%)' }} />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <svg width="48" height="48" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="26" stroke="url(#loginGrad)" strokeWidth="1.5" opacity="0.25"/>
              <circle cx="28" cy="28" r="20" stroke="url(#loginGrad)" strokeWidth="1.5" opacity="0.45"/>
              <circle cx="28" cy="28" r="14" stroke="url(#loginGrad)" strokeWidth="2"/>
              <circle cx="28" cy="28" r="4" fill="#4CD7F6"/>
              <defs><linearGradient id="loginGrad" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#4CD7F6"/><stop offset="100%" stopColor="#c2d8f8"/></linearGradient></defs>
            </svg>
          </div>
          <h1 className="font-headline text-2xl font-bold vs-gradient-text">PostureGuard</h1>
          <p className="text-sm text-vs-on-surface-variant mt-1">Sign in to continue</p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-xl p-6 flex flex-col gap-4">
          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-vs-surface-low border border-vs-outline-variant/20 hover:border-vs-primary/30 transition-all text-sm text-vs-on-surface"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-vs-outline-variant/20" />
            <span className="text-[10px] text-vs-on-surface-variant uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-vs-outline-variant/20" />
          </div>

          {/* Email */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-vs-surface-low border border-vs-outline-variant/20 text-vs-on-surface text-sm focus:border-vs-primary/40 focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-vs-surface-low border border-vs-outline-variant/20 text-vs-on-surface text-sm focus:border-vs-primary/40 focus:outline-none transition-colors"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="flex-1 vs-btn-primary py-3 rounded-lg text-vs-bg font-headline font-bold text-xs uppercase tracking-widest"
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-vs-surface-mid border border-vs-outline-variant/20 text-vs-on-surface font-headline font-bold text-xs uppercase tracking-widest hover:border-vs-primary/30 transition-colors"
            >
              Sign Up
            </button>
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: error.includes('Check') ? '#22c55e' : '#ef4444' }}>
              {error}
            </p>
          )}
        </div>

        {/* Back */}
        <div className="text-center mt-6">
          <a href="/" className="text-xs text-vs-on-surface-variant hover:text-vs-primary transition-colors">
            &larr; Back to home
          </a>
        </div>
      </div>
    </div>
  )
}
