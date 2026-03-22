'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const supabaseRef = useRef(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'

  useEffect(() => {
    const supabase = createBrowserClient()
    supabaseRef.current = supabase

    const navigate = (path) => {
      if (path.startsWith('/auth/extension')) {
        window.location.href = path
      } else {
        router.push(path)
      }
    }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password required'); return }
    if (isSignUp && password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')

    const supabase = supabaseRef.current
    if (isSignUp) {
      const { error: err } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (err) setError(err.message)
      else setError('Check your email to confirm!')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#09090b]">

      {/* ── Left: Brand Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-[#131313]">
        {/* Scanline overlay — matches landing page */}
        <div className="absolute inset-0 pointer-events-none hud-scanlines opacity-50" />
        <div className="absolute inset-0 scanline-bg" />

        {/* Cyan glow behind logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[350px] h-[350px] rounded-full bg-[#c3f5ff]/[0.04] blur-[120px]" />
        </div>

        {/* Status badge + accent border — matches landing nav */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c3f5ff]/20 to-transparent" />

        {/* Centered logo + brand */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <svg width="80" height="80" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="url(#lgGrad)" strokeWidth="1" opacity="0.25"/>
            <circle cx="28" cy="28" r="20" stroke="url(#lgGrad)" strokeWidth="1.2" opacity="0.4"/>
            <circle cx="28" cy="28" r="14" stroke="url(#lgGrad)" strokeWidth="1.5"/>
            <circle cx="28" cy="28" r="4" fill="#c3f5ff"/>
            <defs><linearGradient id="lgGrad" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#c3f5ff"/><stop offset="100%" stopColor="#66d9cc"/></linearGradient></defs>
          </svg>
          <span className="text-5xl font-bold text-[#e5e2e1] font-headline tracking-tighter uppercase">PostureGuard</span>
          <p className="font-headline text-[#c3f5ff]/70 text-xs uppercase tracking-widest font-bold max-w-[300px] text-center">For engineers, designers, and writers who sit 6+ hours a day.</p>
        </div>
      </div>

      {/* ── Right: Sign-in Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 sm:px-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="26" stroke="url(#lgGradM)" strokeWidth="1.5" opacity="0.3"/>
              <circle cx="28" cy="28" r="20" stroke="url(#lgGradM)" strokeWidth="1.5" opacity="0.5"/>
              <circle cx="28" cy="28" r="14" stroke="url(#lgGradM)" strokeWidth="2"/>
              <circle cx="28" cy="28" r="4" fill="#4CD7F6"/>
              <defs><linearGradient id="lgGradM" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#4CD7F6"/><stop offset="100%" stopColor="#c2d8f8"/></linearGradient></defs>
            </svg>
            <span className="text-xl font-bold text-white font-headline">PostureGuard</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-white font-headline">
            {isSignUp ? 'Create account' : 'Sign in'}
          </h1>
          <p className="text-sm text-neutral-400 mt-2 mb-8">
            {isSignUp ? 'Get started with PostureGuard.' : 'Welcome back! Please sign in to continue.'}
          </p>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-lg bg-[#1a1a1e] border border-white/[0.08] hover:border-white/[0.16] transition-colors text-sm text-white font-medium"
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
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-neutral-500">or</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-300 mb-1.5 block">Email address</label>
              <input
                type="email"
                placeholder="hello@app.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg bg-[#1a1a1e] border border-white/[0.08] text-white text-sm placeholder-neutral-500 focus:border-[#4CD7F6]/50 focus:outline-none focus:ring-1 focus:ring-[#4CD7F6]/20 transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-300 mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-lg bg-[#1a1a1e] border border-white/[0.08] text-white text-sm placeholder-neutral-500 focus:border-[#4CD7F6]/50 focus:outline-none focus:ring-1 focus:ring-[#4CD7F6]/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-[#4CD7F6] text-[#09090b] font-semibold text-sm hover:bg-[#3bc4e2] transition-colors disabled:opacity-50 mt-1 shadow-lg shadow-[#4CD7F6]/20"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Continue'}
            </button>

            {error && (
              <p className="text-xs text-center" style={{ color: error.includes('Check') ? '#22c55e' : '#ef4444' }}>
                {error}
              </p>
            )}
          </form>

          {/* Toggle */}
          <p className="text-center text-sm text-neutral-400 mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-white font-semibold hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-neutral-600 mt-8">
            &copy; PostureGuard &middot; Privacy &middot; Terms
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#09090b] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#4CD7F6] border-t-transparent animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
