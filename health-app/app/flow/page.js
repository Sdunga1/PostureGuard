'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'

// ── Exercise Pool (mapped to posture issue types) ────────────────────────────
const EXERCISE_POOL = [
  {
    id: 1,
    name: 'Chin Tucks',
    subtitle: 'Neural Alignment Routine',
    duration: 105,
    target: '12 Reps',
    tip: 'Keep your eyes level and tuck your chin toward your throat.',
    image: '/exercises/chin-tucks.webp',
    issues: ['forward_head', 'slouch'],
  },
  {
    id: 2,
    name: 'Shoulder Rolls',
    subtitle: 'Postural Reset Protocol',
    duration: 120,
    target: '15 Reps',
    tip: 'Roll shoulders backward in a slow, full circular motion.',
    image: '/exercises/shoulder-rolls.webp',
    issues: ['shoulder_asymmetry', 'slouch'],
  },
  {
    id: 3,
    name: 'Neck Stretches',
    subtitle: 'Cervical Release Sequence',
    duration: 90,
    target: '10 Reps',
    tip: 'Gently tilt head side to side, hold each position for 3 seconds.',
    image: '/exercises/neck_stretch.mp4',
    issues: ['lateral_tilt', 'forward_head'],
  },
  {
    id: 4,
    name: 'Back Extensions',
    subtitle: 'Lumbar Strengthening',
    duration: 150,
    target: '12 Reps',
    tip: 'Extend spine tall, squeeze shoulder blades together firmly.',
    image: '/exercises/back-stretch.mp4',
    issues: ['slouch', 'forward_head'],
  },
  {
    id: 5,
    name: 'Hip Flexor Stretch',
    subtitle: 'Lower Body Alignment',
    duration: 120,
    target: '30s each side',
    tip: 'Lunge forward and press hips downward, feeling the stretch through hip flexors.',
    image: '/exercises/hip_stretch.mp4',
    issues: ['slouch'],
  },
  {
    id: 6,
    name: 'Shoulder Blade Squeeze',
    subtitle: 'Scapular Stabilization',
    duration: 90,
    target: '15 Reps',
    tip: 'Squeeze shoulder blades together, hold for 3 seconds, then release.',
    image: '/exercises/shoulder_sqeeze.mp4',
    issues: ['shoulder_asymmetry', 'slouch'],
  },
  {
    id: 7,
    name: 'Cat-Cow Stretch',
    subtitle: 'Spinal Mobility Drill',
    duration: 90,
    target: '10 Reps',
    tip: 'Alternate between arching your back (cow) and rounding it (cat) slowly.',
    image: '/exercises/cat-cow-stretch.webp',
    issues: ['slouch', 'lateral_tilt'],
  },
  {
    id: 8,
    name: 'Spinal Twist',
    subtitle: 'Rotational Release Protocol',
    duration: 90,
    target: '10 each side',
    tip: 'Sit upright, rotate upper body slowly to each side while keeping hips still.',
    image: '/exercises/spinal-twist.webp',
    issues: ['slouch', 'lateral_tilt', 'shoulder_asymmetry'],
  },
  {
    id: 9,
    name: 'Chest Opener Stretch',
    subtitle: 'Anterior Chain Release',
    duration: 90,
    target: '30s hold x3',
    tip: 'Clasp hands behind back, lift chest and gently pull arms back.',
    image: '/exercises/chest-opener-stretch.png',
    issues: ['forward_head', 'screen_distance', 'slouch'],
  },
  {
    id: 10,
    name: 'Neck Isometrics',
    subtitle: 'Cervical Stability Training',
    duration: 90,
    target: '10s hold x6',
    tip: 'Press head against hand in each direction without moving. Hold steady.',
    image: '/exercises/neck-isometrics.webp',
    issues: ['lateral_tilt', 'forward_head'],
  },
]

// Default exercise set (used when no session data available)
const DEFAULT_EXERCISES = EXERCISE_POOL.slice(0, 5)

/**
 * Select exercises based on session posture issues.
 * Prioritizes exercises that target the most frequent issues.
 */
function selectExercises(sessionReport, poolSize = 5) {
  if (!sessionReport?.metrics?.worstPeriods?.length) return DEFAULT_EXERCISES

  // Tally issue frequencies from worst periods
  const issueCounts = {}
  for (const wp of sessionReport.metrics.worstPeriods) {
    if (wp.issue) {
      issueCounts[wp.issue] = (issueCounts[wp.issue] || 0) + 1
    }
  }

  // Also consider Claude analysis issues if available
  const claudeIssues = sessionReport.claude_analysis?.issues || []
  for (const ci of claudeIssues) {
    const key = ci.type || ci.issue
    if (key) issueCounts[key] = (issueCounts[key] || 0) + 2 // Weight Claude issues higher
  }

  if (Object.keys(issueCounts).length === 0) return DEFAULT_EXERCISES

  // Rank issues by frequency
  const rankedIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([issue]) => issue)

  // Score each exercise by how well it matches top issues
  const scored = EXERCISE_POOL.map(ex => {
    let score = 0
    for (let i = 0; i < rankedIssues.length; i++) {
      if (ex.issues.includes(rankedIssues[i])) {
        score += (rankedIssues.length - i) // Higher rank = more points
      }
    }
    return { ...ex, _score: score }
  })

  // Sort by score descending, pick top N
  scored.sort((a, b) => b._score - a._score)
  const selected = scored.slice(0, poolSize)

  // If we got fewer matches than poolSize, fill with defaults
  if (selected.length < poolSize) {
    for (const ex of DEFAULT_EXERCISES) {
      if (selected.length >= poolSize) break
      if (!selected.find(s => s.id === ex.id)) selected.push(ex)
    }
  }

  return selected
}

const AFFIRMING_QUOTES = [
  'Your body is a temple, treat it with neural precision.',
  'Every rep is a step toward perfect alignment.',
  'Strength begins in the spine and flows through the mind.',
]

const AFFIRMING_QUOTES_END = [
  'Today was a gift for your spine.',
  'Your discipline is building a stronger tomorrow.',
  'The neural pathways you forge today last a lifetime.',
]

// ── Utility ────────────────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── TopHeader ──────────────────────────────────────────────────────────────────
function TopHeader({ title = 'PostureGuard', subTitle = '', user = null, onSignIn, onSignOut }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-vs-bg/80 backdrop-blur-md border-b border-vs-outline-variant/20">
      <div className="flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Concentric circles logo — matching extension */}
          <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="url(#hg)" strokeWidth="1.5" opacity="0.25"/>
            <circle cx="28" cy="28" r="20" stroke="url(#hg)" strokeWidth="1.5" opacity="0.45"/>
            <circle cx="28" cy="28" r="14" stroke="url(#hg)" strokeWidth="2"/>
            <circle cx="28" cy="28" r="4" fill="#4CD7F6"/>
            <defs><linearGradient id="hg" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#4CD7F6"/><stop offset="100%" stopColor="#c2d8f8"/></linearGradient></defs>
          </svg>
          <span className="text-lg font-extrabold text-vs-on-surface font-headline tracking-tighter">{title}</span>
          {subTitle && (
            <>
              <div className="h-4 w-px bg-vs-outline-variant/30 ml-1" />
              <span className="font-label text-[10px] uppercase tracking-widest text-vs-primary/80 ml-1">{subTitle}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8">
            <span className="font-label text-xs uppercase tracking-widest text-vs-primary cursor-pointer">Flow</span>
            <a href="/dashboard" className="font-label text-xs uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-on-surface cursor-pointer transition-colors">Insights</a>
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
          ) : onSignIn ? (
            <button onClick={onSignIn} className="px-5 py-2 rounded-lg bg-vs-surface-mid border border-vs-outline-variant/20 hover:border-vs-primary/30 transition-all">
              <span className="font-label text-xs text-vs-on-surface">Sign In</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

// ── Screen: LANDING (public, unauthenticated) ────────────────────────────────
function LandingScreen() {
  const goToLogin = () => { window.location.href = '/login' }

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col">
      <TopHeader onSignIn={goToLogin} />

      <div className="fixed inset-0 dot-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(76,215,246,0.06) 0%, transparent 60%)' }} />

      {/* Hero */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16">
        <div className="text-center max-w-2xl mx-auto">
          {/* Brand Icon */}
          <div className="mb-8 flex justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="38" stroke="url(#lg)" strokeWidth="1.5" opacity="0.25"/>
              <circle cx="40" cy="40" r="28" stroke="url(#lg)" strokeWidth="1.5" opacity="0.45"/>
              <circle cx="40" cy="40" r="18" stroke="url(#lg)" strokeWidth="2"/>
              <circle cx="40" cy="40" r="6" fill="#4CD7F6"/>
              <defs><linearGradient id="lg" x1="0" y1="0" x2="80" y2="80"><stop offset="0%" stopColor="#4CD7F6"/><stop offset="100%" stopColor="#c2d8f8"/></linearGradient></defs>
            </svg>
          </div>

          <h1 className="text-5xl md:text-7xl font-headline font-bold tracking-tight text-vs-on-surface mb-4">
            Your posture,<br />
            <span className="vs-gradient-text">reimagined.</span>
          </h1>
          <p className="text-lg md:text-xl text-vs-on-surface-variant font-light max-w-lg mx-auto mb-12 leading-relaxed">
            AI-powered posture detection and personalized recovery exercises.
            Track, improve, and protect your spine — all from your browser.
          </p>

          {/* CTA */}
          <button
            onClick={goToLogin}
            className="vs-btn-primary px-12 py-4 rounded-lg text-vs-bg font-headline font-bold uppercase tracking-widest text-sm mb-4"
          >
            Get Started
          </button>
          <p className="text-xs text-vs-on-surface-variant/50">Free during beta. No credit card required.</p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-20">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-vs-primary/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <h3 className="font-headline font-semibold text-vs-on-surface mb-2">Real-Time Detection</h3>
            <p className="text-sm text-vs-on-surface-variant">Camera-based posture analysis runs locally in your browser. Your data never leaves your device.</p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-vs-primary/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20 12a8 8 0 0 0-8-8v8h8z"/>
              </svg>
            </div>
            <h3 className="font-headline font-semibold text-vs-on-surface mb-2">AI Coaching</h3>
            <p className="text-sm text-vs-on-surface-variant">Claude-powered nudges correct your posture in real time with personalized advice.</p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-vs-primary/10 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <h3 className="font-headline font-semibold text-vs-on-surface mb-2">Recovery Sessions</h3>
            <p className="text-sm text-vs-on-surface-variant">Guided exercises tailored to your posture issues. Track progress across sessions.</p>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto mt-24 text-center">
          <h2 className="font-headline text-2xl font-bold text-vs-on-surface mb-12">How it works</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            {[
              { step: '01', title: 'Install Extension', desc: 'Add PostureGuard to Chrome in one click' },
              { step: '02', title: 'Calibrate', desc: 'Sit up straight and capture your ideal posture' },
              { step: '03', title: 'Get Coached', desc: 'AI monitors and nudges you to maintain posture' },
              { step: '04', title: 'Recover', desc: 'Personalized exercises based on your session data' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="font-headline text-3xl font-bold vs-gradient-text mb-2">{item.step}</span>
                <h3 className="font-headline font-semibold text-vs-on-surface text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-vs-on-surface-variant max-w-[140px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 text-center">
          <p className="text-xs text-vs-on-surface-variant/40">
            Built for HackASU 2026 &middot; Privacy-first &middot; Camera data stays on your device
          </p>
        </footer>
      </main>
    </div>
  )
}

// ── Screen: INTRO ─────────────────────────────────────────────────────────────
// Phase 0 → greeting alone, centred, full screen
// Phase 1 → greeting fades out, quote appears alone, centred
// Phase 2 → quote fades out, report card appears (clean – no name/quote above)
function IntroScreen({ onStart, user, sessionReport, workoutCompleted, onSignIn, onSignOut }) {
  // Decide once at mount whether to skip — never recalculate on re-renders
  // Animation plays when: came from extension (?id= in URL)
  const [skipAnim] = useState(() => {
    if (typeof window === 'undefined') return true
    const hasId = new URLSearchParams(window.location.search).has('id')
    if (!hasId) return true // navigating within app — skip
    return false
  })
  const cameFromInsights = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'insights'
  const [phase, setPhase] = useState(skipAnim ? 2 : 0)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (skipAnim) return
    const t1 = setTimeout(() => setPhase(1), 2200)
    const t2 = setTimeout(() => setPhase(2), 4600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [skipAnim])

  // Each panel: absolutely positioned, stacked in the same space
  const panel = (p) => ({
    position: p === 2 ? 'relative' : 'absolute',
    inset: p === 2 ? undefined : 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    textAlign: 'center',
    opacity: phase === p ? 1 : 0,
    transform: phase === p
      ? 'translateY(0)'
      : phase < p
        ? 'translateY(28px)'
        : 'translateY(-28px)',
    transition: 'opacity 0.75s ease, transform 0.75s ease',
    pointerEvents: phase === p ? 'auto' : 'none',
  })

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col">
      <TopHeader user={user} onSignIn={onSignIn} onSignOut={onSignOut} />
      <div className="fixed inset-0 dot-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(76,215,246,0.06) 0%, transparent 60%)' }} />

      <main className="relative flex-1 flex items-center justify-center px-6 pt-20 pb-10 overflow-hidden">
        {/* Stage — panels 0 & 1 are absolute, panel 2 flows naturally */}
        <div className="relative w-full max-w-xl" style={{ minHeight: '520px' }}>

          {/* ── Panel 0 : Greeting ── */}
          <div style={panel(0)} className="px-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-bold tracking-tight text-vs-on-surface">
              Welcome back,<br /><span className="vs-gradient-text">{user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'}.</span>
            </h1>
          </div>

          {/* ── Panel 1 : Quote ── */}
          <div style={panel(1)} className="px-4">
            <p className="text-2xl md:text-3xl font-headline italic text-vs-on-surface-variant font-light max-w-lg leading-relaxed">
              &ldquo;{AFFIRMING_QUOTES[0]}&rdquo;
            </p>
          </div>

          {/* ── Panel 2 : Report Card ── */}
          <div style={{ ...panel(2), alignItems: 'stretch', overflowY: 'auto' }}>
            <div className="glass-panel synaptic-glow rim-light rounded-2xl p-8 border border-vs-outline-variant/10 flex flex-col gap-6 w-full">
              {/* Card Header */}
              <div className="flex justify-between items-end border-b border-vs-outline-variant/10 pb-5">
                <div className="text-left">
                  <span className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-primary/80">Analysis Meta</span>
                  <h2 className="font-headline text-2xl font-bold mt-1 text-vs-on-surface">Digital Synthesis Report</h2>
                </div>
                <div className="text-right">
                  <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant/60">Session ID</span>
                  <p className="font-mono text-sm text-vs-on-surface-variant mt-0.5">{sessionReport?.session_id ? sessionReport.session_id.slice(0, 8).toUpperCase() : 'PG-LIVE'}</p>
                </div>
              </div>

              {/* Metrics */}
              {sessionReport ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                      <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Posture Score</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-headline text-3xl font-bold text-vs-primary">{sessionReport.avg_score != null ? `${sessionReport.avg_score}%` : '--'}</span>
                        {sessionReport.avg_score != null && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="2.5">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                      <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Head Tilt <span className="normal-case opacity-50">(last 30s)</span></span>
                      <span className="font-headline text-3xl font-bold text-vs-on-surface mt-1">{sessionReport.metrics?.avgHeadTilt != null ? `${Math.round(sessionReport.metrics.avgHeadTilt)}°` : '--'}</span>
                    </div>
                    <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                      <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Slouch Angle <span className="normal-case opacity-50">(last 30s)</span></span>
                      <span className="font-headline text-3xl font-bold text-vs-on-surface mt-1">{sessionReport.metrics?.avgSlouchAngle != null ? `${sessionReport.metrics.avgSlouchAngle.toFixed(1)}°` : '--'}</span>
                    </div>
                  </div>

                  {/* Enhanced Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                      <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Upright Time</span>
                      <span className={`font-headline text-3xl font-bold mt-1 ${
                        sessionReport.metrics?.uprightPercent == null ? 'text-vs-on-surface-variant' :
                        sessionReport.metrics.uprightPercent >= 70 ? 'text-green-400' :
                        sessionReport.metrics.uprightPercent >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{sessionReport.metrics?.uprightPercent != null ? `${Math.round(sessionReport.metrics.uprightPercent)}%` : '--'}</span>
                    </div>
                    <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                      <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Slouch Events</span>
                      <span className={`font-headline text-3xl font-bold mt-1 ${
                        sessionReport.metrics?.slouchEventCount == null ? 'text-vs-on-surface-variant' :
                        sessionReport.metrics.slouchEventCount <= 2 ? 'text-green-400' :
                        sessionReport.metrics.slouchEventCount <= 5 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{sessionReport.metrics?.slouchEventCount ?? '--'}</span>
                    </div>
                    <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                      <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Session Trend</span>
                      <span className={`font-headline text-3xl font-bold mt-1 ${
                        sessionReport.metrics?.postureTrend == null ? 'text-vs-on-surface-variant' :
                        sessionReport.metrics.postureTrend < -2 ? 'text-green-400' :
                        sessionReport.metrics.postureTrend > 2 ? 'text-red-400' : 'text-vs-primary'
                      }`}>{
                        sessionReport.metrics?.postureTrend == null ? '--' :
                        sessionReport.metrics.postureTrend < -2 ? 'Improved' :
                        sessionReport.metrics.postureTrend > 2 ? 'Declined' : 'Steady'
                      }</span>
                    </div>
                  </div>
                  {showDetails && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                        <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Shoulder Health</span>
                        <span className="font-headline text-3xl font-bold text-vs-on-surface mt-1">{sessionReport.metrics?.avgShoulderAngle != null ? `${Math.abs(sessionReport.metrics.avgShoulderAngle).toFixed(1)}°` : '--'}</span>
                      </div>
                      <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                        <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Best Streak</span>
                        <span className="font-headline text-3xl font-bold text-vs-primary mt-1">{(() => {
                          const s = sessionReport.metrics?.longestGoodStreak;
                          if (s == null) return '--';
                          const m = Math.floor(s / 60);
                          const sec = Math.round(s % 60);
                          return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
                        })()}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-primary transition-colors self-center"
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vs-primary/10 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="1.5">
                      <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20 12a8 8 0 0 0-8-8v8h8z"/>
                    </svg>
                  </div>
                  <p className="font-body text-sm text-vs-on-surface-variant max-w-xs">
                    No sessions yet. Complete a posture monitoring session in the extension to see your metrics here.
                  </p>
                </div>
              )}

              {/* CTA */}
              {workoutCompleted && sessionReport ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-2 py-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-label text-[10px] uppercase tracking-widest text-green-400">Workout Complete</span>
                  </div>
                  <a
                    href="/dashboard"
                    className="vs-btn-primary w-full py-5 rounded-lg text-vs-bg font-headline font-bold uppercase tracking-widest text-sm text-center block"
                  >
                    View All Sessions
                  </a>
                </div>
              ) : cameFromInsights ? (
                // Came from insights — just show Back to Insights, no start button
                <a
                  href="/dashboard"
                  className="vs-btn-primary w-full py-5 rounded-lg text-vs-bg font-headline font-bold uppercase tracking-widest text-sm text-center block"
                >
                  Back to Insights
                </a>
              ) : (
                // From extension or fresh home — start workout
                <button
                  onClick={onStart}
                  className="vs-btn-primary w-full py-5 rounded-lg text-vs-bg font-headline font-bold uppercase tracking-widest text-sm"
                >
                  Start Recovery Session
                </button>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

// ── Screen: COUNTDOWN ─────────────────────────────────────────────────────────
function CountdownScreen({ onComplete }) {
  const [count, setCount] = useState(3)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    if (count > 0) {
      const t = setTimeout(() => {
        setCount(c => c - 1)
        setAnimKey(k => k + 1)
      }, 1000)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(onComplete, 800)
      return () => clearTimeout(t)
    }
  }, [count, onComplete])

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 synaptic-pulse pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(76,215,246,0.08) 0%, transparent 60%)' }} />

      <div className="relative z-10 flex flex-col items-center gap-8">
        <span className="font-label text-[11px] uppercase tracking-[0.25em] text-vs-primary/70">Session Starting</span>

        <div className="relative flex items-center justify-center">
          {/* Rotating ring */}
          <svg className="absolute w-64 h-64 animate-spin-slow" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(76,215,246,0.1)" strokeWidth="1" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(76,215,246,0.4)" strokeWidth="1.5"
              strokeDasharray="60 500" strokeLinecap="round" />
          </svg>
          {/* Countdown number */}
          <div
            key={animKey}
            className="font-headline font-bold text-center timer-glow"
            style={{
              fontSize: count === 0 ? '4rem' : '9rem',
              color: count === 0 ? '#4CD7F6' : '#e1e3e8',
              animation: 'vs-countdown 0.6s ease-out forwards',
            }}
          >
            {count === 0 ? 'GO!' : count}
          </div>
        </div>

        <p className="text-vs-on-surface-variant text-sm font-body">
          {count === 3 ? 'Get ready...' : count === 2 ? 'Take position...' : count === 1 ? 'Here we go...' : 'Begin!'}
        </p>
      </div>

      <style>{`
        @keyframes vs-countdown {
          0% { transform: scale(0.4); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Screen: SESSION ────────────────────────────────────────────────────────────
function SessionScreen({ exercise, exerciseIndex, totalExercises, timeLeft, onPause, onSkipNext, onSkipPrev, user, onSignOut }) {
  const progress = exerciseIndex / totalExercises
  const progressPct = Math.round(progress * 100)

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col">
      <TopHeader title="PostureGuard" subTitle="Active Session" user={user} onSignOut={onSignOut} />

      <main className="min-h-screen pt-24 pb-32 px-4 md:px-6 flex flex-col items-center justify-center max-w-6xl mx-auto w-full">
        {/* Exercise Header */}
        <div className="w-full max-w-4xl mb-10 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-center text-vs-on-surface">
              {exercise.name}
            </h1>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant">{exercise.subtitle}</p>
          </div>
          <div className="w-full max-w-md mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">
                {exerciseIndex + 1} of {totalExercises} Exercises
              </span>
              <span className="font-label text-[10px] uppercase tracking-widest text-vs-primary">
                {progressPct}% Complete
              </span>
            </div>
            <div className="h-1.5 w-full bg-vs-surface-high rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #4CD7F6, #c2d8f8)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="relative w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
          {/* Left: Timer + Target (desktop) */}
          <div className="hidden md:flex col-span-2 flex-col gap-8 items-center justify-center h-full">
            <div className="text-center">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant mb-2">Time Left</p>
              <p className="font-headline text-4xl font-light tracking-tighter text-vs-on-surface timer-glow">
                {formatTime(timeLeft)}
              </p>
            </div>
            <div className="h-24 w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(76,215,246,0.2), transparent)' }} />
            <div className="text-center">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant mb-2">Target</p>
              <p className="font-headline text-2xl font-medium text-vs-on-surface">{exercise.target}</p>
            </div>
          </div>

          {/* Center: Exercise Media */}
          <div className="col-span-1 md:col-span-8 relative rounded-2xl overflow-hidden synaptic-glow bg-vs-surface-mid border-t border-vs-primary/15" style={{ aspectRatio: '4/3', minHeight: '360px' }}>
            {exercise.image.endsWith('.mp4') ? (
              <video
                key={exercise.image}
                src={exercise.image}
                className="w-full h-full object-contain"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={exercise.image}
                alt={exercise.name}
                className="w-full h-full object-contain opacity-90 transition-opacity duration-700"
              />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #050505 0%, transparent 60%)' }} />
            <div className="absolute bottom-4 left-4 flex items-center gap-3 glass-panel px-4 py-2 rounded-full border border-vs-outline-variant/20">
              <span className="flex h-2 w-2 rounded-full bg-vs-primary animate-pulse" />
              <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface">Focus on form</span>
            </div>
          </div>

          {/* Mobile: Timer row */}
          <div className="flex md:hidden justify-around w-full py-4 bg-vs-surface-mid/50 rounded-xl">
            <div className="text-center">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant mb-1">Time Left</p>
              <p className="font-headline text-3xl font-bold text-vs-primary timer-glow">{formatTime(timeLeft)}</p>
            </div>
            <div className="text-center">
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant mb-1">Target</p>
              <p className="font-headline text-3xl font-bold text-vs-on-surface">{exercise.target}</p>
            </div>
          </div>

          {/* Right: Tip (desktop) */}
          <div className="hidden md:flex col-span-2 flex-col gap-4">
            <div className="p-4 rounded-2xl bg-vs-surface-mid border-t border-vs-outline-variant/10">
              <div className="w-6 h-6 rounded-full bg-vs-tertiary/20 flex items-center justify-center mb-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c2d8f8" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="font-body text-xs text-vs-on-surface-variant leading-relaxed">{exercise.tip}</p>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
          <div className="glass-panel p-2 rounded-full flex items-center justify-between synaptic-glow border border-vs-outline-variant/15">
            <button
              onClick={onSkipPrev}
              className="w-12 h-12 flex items-center justify-center text-vs-on-surface-variant hover:text-vs-on-surface transition-colors rounded-full hover:bg-vs-surface-mid"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={onPause}
              className="flex-1 mx-2 h-14 rounded-full flex items-center justify-center gap-3 font-label text-sm font-bold uppercase tracking-widest text-vs-bg vs-btn-primary"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
              Pause Session
            </button>
            <button
              onClick={onSkipNext}
              className="w-12 h-12 flex items-center justify-center text-vs-on-surface-variant hover:text-vs-on-surface transition-colors rounded-full hover:bg-vs-surface-mid"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zm2-8.14 5.3 3.8L8 17.14V9.86zM16 6h2v12h-2z" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Screen: PAUSED ────────────────────────────────────────────────────────────
function PausedScreen({ exercise, nextExercise, pausedSeconds, onResume, user, onSignOut }) {
  // Circular timer — show 30s rest window
  const restDuration = 30
  const circumference = 2 * Math.PI * 90
  const remaining = Math.max(0, restDuration - pausedSeconds)
  const strokeOffset = circumference * (remaining / restDuration)

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col">
      <TopHeader title="PostureGuard" subTitle="Rest" user={user} onSignOut={onSignOut} />
      <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden pt-20 pb-24 px-6">
        <div className="absolute inset-0 synaptic-pulse pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(76,215,246,0.05) 0%, transparent 60%)' }} />

        <div className="relative z-10 flex flex-col items-center text-center space-y-10 max-w-lg w-full">
          {/* Phase Label */}
          <div className="space-y-2">
            <span className="font-label text-vs-primary tracking-[0.2em] text-[11px] uppercase opacity-80">Rest Phase</span>
            <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-vs-on-surface">
              Take a breath.
            </h1>
          </div>

          {/* Circular Timer */}
          <div className="relative flex items-center justify-center">
            <svg className="w-64 h-64 md:w-72 md:h-72" viewBox="0 0 200 200">
              {/* Background ring */}
              <circle cx="100" cy="100" r="90" fill="transparent"
                stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
              {/* Progress ring */}
              <circle
                cx="100" cy="100" r="90" fill="transparent"
                stroke="rgba(76,215,246,0.5)" strokeWidth="3"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={circumference - strokeOffset}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-headline text-7xl md:text-8xl font-light tracking-tighter text-vs-on-surface timer-glow">
                {remaining}
              </span>
            </div>
          </div>

          {/* Next Exercise Card */}
          {nextExercise && (
            <div className="w-full max-w-sm bg-vs-surface-mid rounded-2xl p-5 border border-vs-outline-variant/15 shadow-2xl">
              <div className="flex items-center gap-4 text-left">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-vs-surface-high flex-shrink-0">
                  {nextExercise.image.endsWith('.mp4') ? (
                    <video
                      src={nextExercise.image}
                      className="w-full h-full object-cover opacity-80"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img src={nextExercise.image} alt={nextExercise.name} className="w-full h-full object-cover opacity-80" />
                  )}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(21,27,35,0.7), transparent)' }} />
                </div>
                <div className="flex-1">
                  <span className="font-label text-vs-tertiary text-[10px] tracking-widest uppercase">Up Next</span>
                  <h3 className="font-headline text-lg font-semibold text-vs-on-surface mt-0.5">{nextExercise.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a939e" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="font-body text-xs text-vs-on-surface-variant">{formatTime(nextExercise.duration)} duration</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resume Button */}
          <button
            onClick={onResume}
            className="vs-btn-primary w-full max-w-sm py-5 rounded-lg text-vs-bg font-headline font-bold uppercase tracking-widest text-sm"
          >
            Resume Session
          </button>

          <p className="text-vs-on-surface-variant text-xs font-label uppercase tracking-widest opacity-60">
            Your progress is saved
          </p>
        </div>

      </main>
    </div>
  )
}

// ── Screen: COMPLETE ───────────────────────────────────────────────────────────
function CompleteScreen({ sessionData, exercises = DEFAULT_EXERCISES, onReturn, userName, user, onSignOut, isHistorical = false }) {
  const [phase, setPhase] = useState(0)
  // phase 0: quote only
  // phase 1: quote fades + session breakdown appears

  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative min-h-screen bg-vs-bg flex flex-col items-center justify-center py-20 overflow-hidden">
      <div className="fixed inset-0 neural-glow pointer-events-none" />
      <div className="fixed inset-0 dot-grid pointer-events-none" />

      {/* Spine tracks */}
      <div className="fixed left-1/2 -translate-x-1/2 top-0 flex flex-col items-center opacity-20 pointer-events-none">
        <div className="spine-track" />
        <div className="w-2 h-2 rounded-full mt-2" style={{ background: '#c2d8f8', filter: 'blur(2px)' }} />
      </div>
      <div className="fixed left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center opacity-20 pointer-events-none">
        <div className="w-2 h-2 rounded-full mb-2" style={{ background: '#4CD7F6', filter: 'blur(2px)' }} />
        <div className="spine-track" />
      </div>

      <main className="relative z-10 max-w-3xl px-6 text-center w-full" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Quote Phase - initial fade-in quote only */}
        <div
          style={{
            opacity: phase === 0 ? 1 : 0,
            transform: phase === 0 ? 'translateY(0)' : 'translateY(-30px)',
            transition: 'opacity 0.7s ease, transform 0.7s ease',
            position: 'absolute',
            left: '50%',
            transform: phase === 0 ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-30px)',
            width: '100%',
            pointerEvents: phase === 0 ? 'auto' : 'none',
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 inline-flex items-center gap-3 px-4 py-2 rounded-full border border-vs-outline-variant/15 bg-vs-surface-mid/30">
              <div className="w-2 h-2 rounded-full bg-vs-tertiary animate-pulse" />
              <span className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant">Neural alignment verified</span>
            </div>
            <h1 className="font-headline text-5xl md:text-7xl font-light text-vs-on-surface tracking-tight leading-tight">
              Today was a <span className="vs-gradient-text italic">gift</span> for your spine.
            </h1>
          </div>
        </div>

        {/* Breakdown Phase */}
        <div
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.9s ease, transform 0.9s ease',
          }}
        >
          <div className="mb-6 inline-flex items-center gap-3 px-4 py-2 rounded-full border border-vs-outline-variant/15 bg-vs-surface-mid/30">
            <div className="w-2 h-2 rounded-full bg-vs-tertiary animate-pulse" />
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant">Neural alignment verified</span>
          </div>

          <h1 className="font-headline text-5xl md:text-7xl font-light text-vs-on-surface tracking-tight leading-tight mb-6">
            Today was a <span className="vs-gradient-text italic">gift</span> for your spine.
          </h1>

          <p className="font-body text-lg text-vs-on-surface-variant/80 max-w-md mx-auto leading-relaxed mb-10">
            Your body is your temple. We&apos;d love to <span className="text-vs-tertiary font-medium">meet you in the next session.</span>
          </p>

          {/* Session Stats */}
          <div className="glass-card max-w-md mx-auto rounded-2xl p-8 mb-8 text-left">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-lg font-medium text-vs-on-surface tracking-tight">Session Breakdown</h2>
              <div className="w-2 h-2 rounded-full bg-vs-primary animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Active Time</p>
                {sessionData?.activeTime != null
                  ? <p className="font-headline text-2xl text-vs-primary">{sessionData.activeTime}<span className="text-sm ml-0.5">m</span></p>
                  : <p className="font-headline text-2xl text-vs-primary">{Math.round((sessionData?.totalDurationSec || 0) / 60)}<span className="text-sm ml-0.5">m</span></p>
                }
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Exercises</p>
                <p className="font-headline text-2xl text-vs-tertiary">{sessionData?.exerciseCount || exercises.length}<span className="text-sm ml-0.5">done</span></p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Total Duration</p>
                <p className="font-headline text-2xl text-vs-on-surface">{Math.round((sessionData?.totalDurationSec || exercises.reduce((s, e) => s + e.duration, 0)) / 60)}<span className="text-sm ml-0.5">m</span></p>
              </div>
            </div>

            {/* Exercises done list */}
            <div className="border-t border-vs-outline-variant/10 pt-5 space-y-3">
              {exercises.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(76,215,246,0.15)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="font-body text-sm text-vs-on-surface-variant">{ex.name}</span>
                  <span className="ml-auto font-mono text-xs text-vs-on-surface-variant/50">{formatTime(ex.duration)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-vs-outline-variant/10 pt-5 mt-4 flex flex-col gap-3">
              {isHistorical ? (
                <a
                  href="/dashboard"
                  className="w-full font-body text-sm text-vs-primary hover:text-vs-on-surface transition-colors uppercase tracking-widest text-center"
                >
                  Back to Insights
                </a>
              ) : (
                <>
                  <button
                    onClick={onReturn}
                    className="w-full font-body text-sm text-vs-primary hover:text-vs-on-surface transition-colors uppercase tracking-widest"
                  >
                    Return to Home
                  </button>
                  <a
                    href="/dashboard"
                    className="w-full font-body text-sm text-vs-on-surface-variant hover:text-vs-primary transition-colors uppercase tracking-widest text-center"
                  >
                    View All Sessions
                  </a>
                </>
              )}
            </div>
          </div>

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant/40">
            See you in the next session, {userName || 'there'}.
          </p>
        </div>
      </main>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('intro')
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_EXERCISES[0].duration)
  const [pausedSeconds, setPausedSeconds] = useState(0)
  const [sessionStartTime] = useState(Date.now())

  // ── Auth State ──
  const [user, setUser] = useState(null)
  const [sessionReport, setSessionReport] = useState(null)
  const [sessionError, setSessionError] = useState(null)
  const [pendingSessionId, setPendingSessionId] = useState(null)
  const [workoutSaved, setWorkoutSaved] = useState(false)
  const [workoutCompleted, setWorkoutCompleted] = useState(false)
  const supabaseRef = useRef(null)
  const workoutStartTimeRef = useRef(null) // Set when session actually begins

  // ── Adaptive Exercises ──
  const exercises = useMemo(() => selectExercises(sessionReport), [sessionReport])

  // Initialize Supabase + check auth
  useEffect(() => {
    const supabase = createBrowserClient()
    supabaseRef.current = supabase

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    // Capture session ID from URL
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('id')
    if (sessionId) {
      setPendingSessionId(sessionId)
    }

    return () => subscription.unsubscribe()
  }, [])

  // Load session data AFTER user is authenticated
  useEffect(() => {
    if (!user) return
    if (sessionReport) return // Already loaded

    const loadSession = async () => {
      try {
        const supabase = supabaseRef.current
        const { data: { session: authSession } } = await supabase.auth.getSession()
        if (!authSession) return

        if (pendingSessionId) {
          // Load specific session from URL param
          const response = await fetch(`/api/sessions/${pendingSessionId}`, {
            headers: { 'Authorization': `Bearer ${authSession.access_token}` }
          })
          const data = await response.json()

          if (response.ok && data.session) {
            setSessionReport(data.session)
            setSessionError(null)
            if (data.session.metrics?.workout_data) {
              setWorkoutCompleted(true)
              setScreen('complete') // Show completion screen directly for completed sessions
            }
          } else if (data.ownerMismatch) {
            setSessionError('This session belongs to a different account. Please sign in with the account you used in the extension.')
          } else if (data.requiresAuth) {
            setSessionError('Please sign in to view this session.')
          } else {
            setSessionError('Session not found.')
          }
        } else {
          // No specific session — load the most recent one
          const response = await fetch('/api/sessions', {
            headers: { 'Authorization': `Bearer ${authSession.access_token}` }
          })
          if (response.ok) {
            const { sessions } = await response.json()
            if (sessions && sessions.length > 0) {
              setSessionReport(sessions[0])
              if (sessions[0].metrics?.workout_data) setWorkoutCompleted(true)
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load session:', err)
        if (pendingSessionId) setSessionError('Failed to load session data.')
      }
    }

    loadSession()
  }, [user, pendingSessionId, sessionReport])

  const handleSignIn = useCallback(() => {
    const supabase = supabaseRef.current
    if (!supabase) return
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' }
    })
  }, [])

  const handleSignOut = useCallback(async () => {
    const supabase = supabaseRef.current
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.href = '/'
  }, [])

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || null

  const currentExercise = exercises[currentExerciseIndex]
  const nextExercise = exercises[currentExerciseIndex + 1] || null

  // ── Session Timer (counts down during 'session') ──
  useEffect(() => {
    if (screen !== 'session') return

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [screen, currentExerciseIndex])

  // ── Advance exercise when timer hits 0 ──
  useEffect(() => {
    if (screen !== 'session' || timeLeft > 0) return

    if (currentExerciseIndex < exercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1
      setCurrentExerciseIndex(nextIdx)
      setTimeLeft(exercises[nextIdx].duration)
    } else {
      setWorkoutCompleted(true)
      setScreen('complete')
    }
  }, [timeLeft, screen, currentExerciseIndex, exercises])

  // ── Pause Timer (counts up during 'paused') ──
  useEffect(() => {
    if (screen !== 'paused') return

    const interval = setInterval(() => {
      setPausedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [screen])

  // ── Save workout completion to Supabase ──
  useEffect(() => {
    if (screen !== 'complete') return
    if (workoutSaved) return
    if (!sessionReport?.id) return

    const saveWorkout = async () => {
      try {
        const supabase = supabaseRef.current
        const { data: { session: authSession } } = await supabase.auth.getSession()
        if (!authSession) return

        const response = await fetch(`/api/sessions/${sessionReport.id}/workout`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            exercises: exercises.map(e => ({ id: e.id, name: e.name, duration: e.duration })),
            activeTimeMinutes: Math.round((Date.now() - sessionStartTime) / 60000),
            completedAt: new Date().toISOString()
          })
        })
        if (response.ok) setWorkoutSaved(true)
      } catch (err) {
        console.warn('Failed to save workout:', err)
      }
    }

    saveWorkout()
  }, [screen, workoutSaved, sessionReport, exercises, sessionStartTime])

  // ── Handlers ──
  const handleStart = useCallback(() => {
    setScreen('countdown')
  }, [])

  const handleCountdownComplete = useCallback(() => {
    workoutStartTimeRef.current = Date.now()
    setCurrentExerciseIndex(0)
    setTimeLeft(exercises[0].duration)
    setScreen('session')
  }, [exercises])

  const handlePause = useCallback(() => {
    setPausedSeconds(0)
    setScreen('paused')
  }, [])

  const handleResume = useCallback(() => {
    setScreen('session')
  }, [])

  const handleSkipNext = useCallback(() => {
    if (currentExerciseIndex < exercises.length - 1) {
      const nextIdx = currentExerciseIndex + 1
      setCurrentExerciseIndex(nextIdx)
      setTimeLeft(exercises[nextIdx].duration)
    } else {
      setWorkoutCompleted(true)
      setScreen('complete')
    }
  }, [currentExerciseIndex, exercises])

  const handleSkipPrev = useCallback(() => {
    if (currentExerciseIndex > 0) {
      const prevIdx = currentExerciseIndex - 1
      setCurrentExerciseIndex(prevIdx)
      setTimeLeft(exercises[prevIdx].duration)
    }
  }, [currentExerciseIndex, exercises])

  const handleReturn = useCallback(() => {
    setScreen('intro')
    setCurrentExerciseIndex(0)
    setTimeLeft(exercises[0].duration)
    setPausedSeconds(0)
  }, [exercises])

  const sessionData = {
    activeTime: workoutStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - workoutStartTimeRef.current) / 60000))
      : null,
    exerciseCount: exercises.length,
    totalDurationSec: exercises.reduce((sum, ex) => sum + ex.duration, 0),
  }

  // ── Render ──

  // Show landing page if not authenticated
  if (!user) {
    return <LandingScreen />
  }

  // Show loading while verifying session ownership
  if (pendingSessionId && !sessionReport && !sessionError) {
    return (
      <div className="bg-vs-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-vs-primary border-t-transparent animate-spin" />
          <p className="text-sm text-vs-on-surface-variant">Loading your session...</p>
        </div>
      </div>
    )
  }

  // Show error if session belongs to a different account
  if (sessionError) {
    return (
      <div className="bg-vs-bg min-h-screen flex flex-col">
        <TopHeader user={user} onSignOut={handleSignOut} />
        <div className="fixed inset-0 dot-grid pointer-events-none" />
        <main className="flex-1 flex items-center justify-center px-6 pt-20">
          <div className="glass-card rounded-2xl p-8 max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h2 className="font-headline text-xl font-bold text-vs-on-surface mb-2">Access Denied</h2>
            <p className="text-sm text-vs-on-surface-variant mb-6">{sessionError}</p>
            <button onClick={handleSignOut} className="vs-btn-primary px-8 py-3 rounded-lg text-vs-bg font-headline font-bold uppercase tracking-widest text-xs">
              Sign in with a different account
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <>
      {screen === 'intro' && (
        <IntroScreen onStart={handleStart} user={user} sessionReport={sessionReport} workoutCompleted={workoutCompleted} onSignIn={handleSignIn} onSignOut={handleSignOut} />
      )}
      {screen === 'countdown' && (
        <CountdownScreen onComplete={handleCountdownComplete} />
      )}
      {screen === 'session' && (
        <SessionScreen
          exercise={currentExercise}
          exerciseIndex={currentExerciseIndex}
          totalExercises={exercises.length}
          timeLeft={timeLeft}
          onPause={handlePause}
          onSkipNext={handleSkipNext}
          onSkipPrev={handleSkipPrev}
          user={user}
          onSignOut={handleSignOut}
        />
      )}
      {screen === 'paused' && (
        <PausedScreen
          exercise={currentExercise}
          nextExercise={nextExercise}
          pausedSeconds={pausedSeconds}
          onResume={handleResume}
          user={user}
          onSignOut={handleSignOut}
        />
      )}
      {screen === 'complete' && (
        <CompleteScreen
          sessionData={sessionData}
          exercises={sessionReport?.metrics?.workout_data?.exercises?.length
            ? sessionReport.metrics.workout_data.exercises
            : exercises}
          onReturn={handleReturn}
          userName={userName}
          user={user}
          onSignOut={handleSignOut}
          isHistorical={!!sessionReport?.metrics?.workout_data && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from') === 'insights'}
        />
      )}
    </>
  )
}
