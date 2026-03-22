'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(seconds) {
  if (!seconds) return '--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function scoreColor(score) {
  if (score == null) return 'text-vs-on-surface-variant'
  if (score >= 70) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabaseRef.current = supabase

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    const loadSessions = async () => {
      try {
        const supabase = supabaseRef.current
        const { data: { session: authSession } } = await supabase.auth.getSession()
        if (!authSession) return

        const response = await fetch('/api/sessions', {
          headers: { 'Authorization': `Bearer ${authSession.access_token}` }
        })
        if (response.ok) {
          const { sessions: data } = await response.json()
          setSessions(data || [])
        }
      } catch (err) {
        console.warn('Failed to load sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [user])

  const handleSignOut = async () => {
    const supabase = supabaseRef.current
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
  }

  // Not authenticated
  if (!user && !loading) {
    return (
      <div className="bg-vs-bg min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="glass-card rounded-2xl p-8 max-w-md text-center">
            <h2 className="font-headline text-xl font-bold text-vs-on-surface mb-4">Sign in to view your sessions</h2>
            <a href="/login" className="vs-btn-primary px-8 py-3 rounded-lg text-vs-bg font-headline font-bold uppercase tracking-widest text-xs inline-block">
              Sign In
            </a>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col">
      <Header user={user} onSignOut={handleSignOut} />
      <div className="fixed inset-0 dot-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(76,215,246,0.06) 0%, transparent 60%)' }} />

      <main className="relative flex-1 px-6 pt-24 pb-16 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-primary/80">Session History</span>
          <h1 className="font-headline text-3xl font-bold mt-1 text-vs-on-surface">Your Insights</h1>
          <p className="font-body text-sm text-vs-on-surface-variant mt-2">
            {sessions.length > 0
              ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded`
              : 'No sessions recorded yet'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 rounded-full border-2 border-vs-primary border-t-transparent animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vs-primary/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="1.5">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20 12a8 8 0 0 0-8-8v8h8z"/>
              </svg>
            </div>
            <h2 className="font-headline text-xl font-bold text-vs-on-surface mb-2">No sessions yet</h2>
            <p className="font-body text-sm text-vs-on-surface-variant max-w-sm mx-auto">
              Complete a posture monitoring session in the Chrome extension to see your history here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((s, i) => (
              <a
                key={s.id}
                href={`/?id=${s.id}&from=insights`}
                className="glass-card rounded-2xl p-6 border border-vs-outline-variant/10 hover:border-vs-primary/30 transition-all cursor-pointer block"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">
                      {formatDate(s.created_at)}
                    </span>
                    <h3 className="font-headline text-lg font-bold text-vs-on-surface mt-1">
                      Session #{sessions.length - i}
                    </h3>
                  </div>
                  <span className={`font-headline text-3xl font-bold ${scoreColor(s.avg_score)}`}>
                    {s.avg_score != null ? `${s.avg_score}%` : '--'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Duration</p>
                    <p className="font-headline text-lg text-vs-on-surface">{formatDuration(s.duration_seconds)}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Alerts</p>
                    <p className="font-headline text-lg text-vs-on-surface">{s.alert_count ?? '--'}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Upright</p>
                    <p className="font-headline text-lg text-vs-on-surface">
                      {s.metrics?.uprightPercent != null ? `${Math.round(s.metrics.uprightPercent)}%` : '--'}
                    </p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Trend</p>
                    <p className={`font-headline text-lg ${
                      s.metrics?.postureTrend == null ? 'text-vs-on-surface-variant' :
                      s.metrics.postureTrend < -2 ? 'text-green-400' :
                      s.metrics.postureTrend > 2 ? 'text-red-400' : 'text-vs-primary'
                    }`}>{
                      s.metrics?.postureTrend == null ? '--' :
                      s.metrics.postureTrend < -2 ? 'Up' :
                      s.metrics.postureTrend > 2 ? 'Down' : 'Steady'
                    }</p>
                  </div>
                </div>

                {s.claude_analysis?.summary && (
                  <p className="mt-4 font-body text-sm text-vs-on-surface-variant/80 line-clamp-2 border-t border-vs-outline-variant/10 pt-3">
                    {s.claude_analysis.summary}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/" className="font-label text-xs uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-primary transition-colors">
            Back to Home
          </a>
        </div>
      </main>
    </div>
  )
}

// Minimal header for dashboard (avoids importing from page.js)
function Header({ user, onSignOut }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-vs-bg/80 backdrop-blur-md border-b border-vs-outline-variant/20">
      <div className="flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="url(#hg)" strokeWidth="1.5" opacity="0.25"/>
            <circle cx="28" cy="28" r="20" stroke="url(#hg)" strokeWidth="1.5" opacity="0.45"/>
            <circle cx="28" cy="28" r="14" stroke="url(#hg)" strokeWidth="2"/>
            <circle cx="28" cy="28" r="4" fill="#4CD7F6"/>
            <defs><linearGradient id="hg" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#4CD7F6"/><stop offset="100%" stopColor="#c2d8f8"/></linearGradient></defs>
          </svg>
          <a href="/" className="text-lg font-extrabold text-vs-on-surface font-headline tracking-tighter">PostureGuard</a>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8">
            <a href="/" className="font-label text-xs uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-on-surface cursor-pointer transition-colors">Flow</a>
            <span className="font-label text-xs uppercase tracking-widest text-vs-primary cursor-pointer">Insights</span>
            <span className="font-label text-xs uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-on-surface cursor-pointer transition-colors">Biometrics</span>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              {user.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-vs-primary/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-vs-primary to-vs-tertiary flex items-center justify-center text-vs-bg font-headline font-bold text-sm">
                  {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <button onClick={onSignOut} className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-primary transition-colors">
                Sign Out
              </button>
            </div>
          ) : (
            <a href="/login" className="px-5 py-2 rounded-lg bg-vs-surface-mid border border-vs-outline-variant/20 hover:border-vs-primary/30 transition-all">
              <span className="font-label text-xs text-vs-on-surface">Sign In</span>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
