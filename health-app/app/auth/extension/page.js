'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'

/**
 * /auth/extension — Bridge page for Chrome extension auth.
 *
 * Flow:
 * 1. Extension opens this page in a new tab
 * 2. If not logged in → redirect to /login?redirect=/auth/extension
 * 3. If logged in → fetch token from /api/auth/token
 * 4. Embed token data in a hidden DOM element
 * 5. Extension content script reads the token and stores it
 * 6. Page shows success message
 */
export default function ExtensionAuthPage() {
  const [status, setStatus] = useState('loading') // loading | success | error
  const [userName, setUserName] = useState('')
  const [tokenData, setTokenData] = useState(null)
  const supabaseRef = useRef(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabaseRef.current = supabase

    async function checkAuthAndGetToken() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not logged in — full page redirect to login (not client-side)
        // so that returning here triggers a fresh page load for the content script
        window.location.href = '/login?redirect=/auth/extension'
        return
      }

      // User is logged in — fetch tokens
      try {
        const res = await fetch('/api/auth/token')
        if (!res.ok) {
          setStatus('error')
          return
        }

        const data = await res.json()
        setTokenData(data)
        setUserName(data.user?.name || data.user?.email || 'User')
        setStatus('success')
      } catch {
        setStatus('error')
      }
    }

    checkAuthAndGetToken()
  }, [])

  return (
    <div className="bg-vs-bg min-h-screen flex items-center justify-center px-6">
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(76,215,246,0.04) 0%, transparent 60%)' }} />

      <div className="relative w-full max-w-sm text-center">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <svg width="48" height="48" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="url(#extGrad)" strokeWidth="1.5" opacity="0.25"/>
            <circle cx="28" cy="28" r="20" stroke="url(#extGrad)" strokeWidth="1.5" opacity="0.45"/>
            <circle cx="28" cy="28" r="14" stroke="url(#extGrad)" strokeWidth="2"/>
            <circle cx="28" cy="28" r="4" fill="#4CD7F6"/>
            <defs><linearGradient id="extGrad" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#4CD7F6"/><stop offset="100%" stopColor="#c2d8f8"/></linearGradient></defs>
          </svg>
        </div>
        <h1 className="font-headline text-2xl font-bold vs-gradient-text mb-6">PostureGuard</h1>

        {status === 'loading' && (
          <div className="glass-card rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-vs-surface-mid rounded w-3/4 mx-auto mb-3"></div>
              <div className="h-3 bg-vs-surface-mid rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-sm text-vs-on-surface-variant mt-4">Checking authentication...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="glass-card rounded-xl p-6">
            <div className="mb-4">
              <svg className="mx-auto" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h2 className="text-lg font-headline font-bold text-vs-on-surface mb-2">
              Signed in as {userName}
            </h2>
            <p className="text-sm text-vs-on-surface-variant mb-4">
              You can now return to the PostureGuard extension. This tab will close automatically.
            </p>
            <p className="text-xs text-vs-on-surface-variant">
              If the tab doesn&apos;t close, you can safely close it manually.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="glass-card rounded-xl p-6">
            <p className="text-sm text-red-400 mb-4">Failed to retrieve session. Please try again.</p>
            <button
              onClick={() => { window.location.href = '/login?redirect=/auth/extension' }}
              className="vs-btn-primary py-3 px-6 rounded-lg text-vs-bg font-headline font-bold text-xs uppercase tracking-widest"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Hidden element for extension content script to read */}
        {tokenData && (
          <div
            id="postureguard-extension-token"
            data-token={JSON.stringify(tokenData)}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  )
}
