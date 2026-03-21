'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Exercise Data ──────────────────────────────────────────────────────────────
const EXERCISES = [
  {
    id: 1,
    name: 'Chin Tucks',
    subtitle: 'Neural Alignment Routine',
    duration: 105,
    target: '12 Reps',
    tip: 'Keep your eyes level and tuck your chin toward your throat.',
    sensor: 'C-Spine sensor at 94% accuracy.',
    image: 'https://images.unsplash.com/photo-1654613412232-10aaf36df8a6?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900',
  },
  {
    id: 2,
    name: 'Shoulder Rolls',
    subtitle: 'Postural Reset Protocol',
    duration: 120,
    target: '15 Reps',
    tip: 'Roll shoulders backward in a slow, full circular motion.',
    sensor: 'Shoulder sensor at 92% accuracy.',
    image: 'https://images.pexels.com/photos/7289370/pexels-photo-7289370.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  },
  {
    id: 3,
    name: 'Neck Stretches',
    subtitle: 'Cervical Release Sequence',
    duration: 90,
    target: '10 Reps',
    tip: 'Gently tilt head side to side, hold each position for 3 seconds.',
    sensor: 'Neck sensor at 91% accuracy.',
    image: 'https://images.pexels.com/photos/6339450/pexels-photo-6339450.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  },
  {
    id: 4,
    name: 'Back Extensions',
    subtitle: 'Lumbar Strengthening',
    duration: 150,
    target: '12 Reps',
    tip: 'Extend spine tall, squeeze shoulder blades together firmly.',
    sensor: 'Lumbar sensor at 89% accuracy.',
    image: 'https://images.unsplash.com/photo-1563427632003-20f6943d3a6d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900',
  },
  {
    id: 5,
    name: 'Hip Flexor Stretch',
    subtitle: 'Lower Body Alignment',
    duration: 120,
    target: '30s each side',
    tip: 'Lunge forward and press hips downward, feeling the stretch through hip flexors.',
    sensor: 'Hip sensor at 93% accuracy.',
    image: 'https://images.unsplash.com/photo-1618069174551-90141d7d4e7f?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900',
  },
]

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
function TopHeader({ title = 'PostureGuard', subTitle = '' }) {
  return (
    <header className="fixed top-0 w-full z-50 bg-vs-bg/80 backdrop-blur-md border-b border-vs-outline-variant/20">
      <div className="flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-vs-primary to-vs-tertiary opacity-90 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-vs-bg" />
          </div>
          <span className="text-lg font-extrabold text-vs-on-surface font-headline tracking-tighter">{title}</span>
          {subTitle && (
            <>
              <div className="h-4 w-px bg-vs-outline-variant/30 ml-1" />
              <span className="font-label text-[10px] uppercase tracking-widest text-vs-primary/80 ml-1">{subTitle}</span>
            </>
          )}
        </div>
        <div className="hidden md:flex items-center gap-8">
          <span className="font-label text-xs uppercase tracking-widest text-vs-primary cursor-pointer">Flow</span>
          <span className="font-label text-xs uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-on-surface cursor-pointer transition-colors">Insights</span>
          <span className="font-label text-xs uppercase tracking-widest text-vs-on-surface-variant hover:text-vs-on-surface cursor-pointer transition-colors">Biometrics</span>
          <div className="w-8 h-8 rounded-full bg-vs-surface-high flex items-center justify-center cursor-pointer hover:bg-vs-surface-highest transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Screen: INTRO ─────────────────────────────────────────────────────────────
// Phase 0 → greeting alone, centred, full screen
// Phase 1 → greeting fades out, quote appears alone, centred
// Phase 2 → quote fades out, report card appears (clean – no name/quote above)
function IntroScreen({ onStart }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2200)   // show greeting 2.2 s
    const t2 = setTimeout(() => setPhase(2), 4600)   // show quote 2.4 s, then card
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Each panel: absolutely positioned, stacked in the same space
  const panel = (p) => ({
    position: 'absolute',
    inset: 0,
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
      <TopHeader />
      <div className="fixed inset-0 dot-grid pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(76,215,246,0.06) 0%, transparent 60%)' }} />

      <main className="relative flex-1 flex items-center justify-center px-6 pt-20 pb-10 overflow-hidden">
        {/* Fixed-height stage — all three panels overlap here */}
        <div className="relative w-full max-w-xl" style={{ height: '520px' }}>

          {/* ── Panel 0 : Greeting ── */}
          <div style={panel(0)} className="px-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-headline font-bold tracking-tight text-vs-on-surface">
              Welcome back,<br /><span className="vs-gradient-text">Sarath.</span>
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
                  <p className="font-mono text-sm text-vs-on-surface-variant mt-0.5">PG-992-DELTA</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                  <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Posture Score</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-headline text-3xl font-bold text-vs-primary">78%</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="2.5">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                    </svg>
                  </div>
                </div>
                <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                  <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Head Tilt</span>
                  <span className="font-headline text-3xl font-bold text-vs-on-surface mt-1">12°</span>
                </div>
                <div className="bg-vs-surface-mid/60 p-4 rounded-xl flex flex-col gap-1 border border-vs-outline-variant/5">
                  <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant">Slouch Angle</span>
                  <span className="font-headline text-3xl font-bold text-vs-on-surface mt-1">4.5°</span>
                </div>
              </div>

              {/* Neural Stream Viz */}
              <div className="w-full h-24 rounded-xl bg-vs-surface-low flex items-end justify-center overflow-hidden relative px-4 pb-3 pt-2">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(76,215,246,0.08) 0%, transparent 50%, rgba(194,216,248,0.06) 100%)' }} />
                <div className="flex gap-1.5 items-end h-14">
                  {[8, 10, 6, 9, 7, 11, 5, 10, 8, 12, 7, 9, 6, 11, 8].map((h, i) => (
                    <div
                      key={i}
                      className="w-2 rounded-t-full"
                      style={{
                        height: `${h * 3.5}px`,
                        background: i % 3 === 0 ? 'rgba(76,215,246,0.6)' : i % 3 === 1 ? 'rgba(76,215,246,0.4)' : 'rgba(194,216,248,0.4)',
                      }}
                    />
                  ))}
                </div>
                <span className="absolute bottom-2 right-3 font-label text-[8px] text-vs-on-surface-variant uppercase tracking-widest">Live Neural Stream</span>
              </div>

              {/* CTA */}
              <button
                onClick={onStart}
                className="vs-btn-primary w-full py-5 rounded-full text-vs-bg font-headline font-bold uppercase tracking-widest text-sm"
              >
                Start Recovery Session
              </button>
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
function SessionScreen({ exercise, exerciseIndex, totalExercises, timeLeft, onPause, onSkipNext, onSkipPrev }) {
  const progress = exerciseIndex / totalExercises
  const progressPct = Math.round(progress * 100)

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col">
      <TopHeader title="NeuralCortex" subTitle="Active Session" />

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
        <div className="relative w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
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

          {/* Center: Exercise Image */}
          <div className="col-span-1 md:col-span-8 relative rounded-2xl overflow-hidden synaptic-glow bg-vs-surface-mid border-t border-vs-primary/15" style={{ aspectRatio: '16/9' }}>
            <img
              src={exercise.image}
              alt={exercise.name}
              className="w-full h-full object-cover opacity-70 transition-opacity duration-700"
              style={{ objectPosition: 'center top' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #050505 0%, transparent 60%)' }} />
            <div className="absolute bottom-4 left-4 flex items-center gap-3 glass-panel px-4 py-2 rounded-full border border-vs-outline-variant/20">
              <span className="flex h-2 w-2 rounded-full bg-vs-primary animate-pulse" />
              <span className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface">Tracking Synaptic Load</span>
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

          {/* Right: Tips (desktop) */}
          <div className="hidden md:flex col-span-2 flex-col gap-4">
            <div className="p-4 rounded-2xl bg-vs-surface-mid border-t border-vs-outline-variant/10">
              <div className="w-6 h-6 rounded-full bg-vs-tertiary/20 flex items-center justify-center mb-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c2d8f8" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p className="font-body text-xs text-vs-on-surface-variant leading-relaxed">{exercise.tip}</p>
            </div>
            <div className="p-4 rounded-2xl bg-vs-surface-mid border-t border-vs-outline-variant/10">
              <div className="w-6 h-6 rounded-full bg-vs-primary/20 flex items-center justify-center mb-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4CD7F6" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" /><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4" />
                </svg>
              </div>
              <p className="font-body text-xs text-vs-on-surface-variant leading-relaxed">{exercise.sensor}</p>
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
function PausedScreen({ exercise, nextExercise, pausedSeconds, onResume }) {
  // Circular timer — show 30s rest window
  const restDuration = 30
  const circumference = 2 * Math.PI * 90
  const remaining = Math.max(0, restDuration - pausedSeconds)
  const strokeOffset = circumference * (remaining / restDuration)

  return (
    <div className="bg-vs-bg min-h-screen flex flex-col">
      <TopHeader />
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
                {formatTime(pausedSeconds)}
              </span>
            </div>
          </div>

          {/* Next Exercise Card */}
          {nextExercise && (
            <div className="w-full max-w-sm bg-vs-surface-mid rounded-2xl p-5 border border-vs-outline-variant/15 shadow-2xl">
              <div className="flex items-center gap-4 text-left">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-vs-surface-high flex-shrink-0">
                  <img src={nextExercise.image} alt={nextExercise.name} className="w-full h-full object-cover opacity-80" />
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
            className="vs-btn-primary w-full max-w-sm py-5 rounded-full text-vs-bg font-headline font-bold uppercase tracking-widest text-sm"
          >
            Resume Session
          </button>

          <p className="text-vs-on-surface-variant text-xs font-label uppercase tracking-widest opacity-60">
            Your progress is saved
          </p>
        </div>

        {/* Ambient tip */}
        <div className="fixed bottom-8 right-6 hidden lg:block">
          <div className="glass-panel px-4 py-3 rounded-full border border-vs-outline-variant/15 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-vs-tertiary animate-pulse" />
            <span className="font-label text-xs tracking-wide text-vs-on-surface-variant">Focus on your lower back during the next set</span>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Screen: COMPLETE ───────────────────────────────────────────────────────────
function CompleteScreen({ sessionData, onReturn }) {
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
                <p className="font-headline text-2xl text-vs-primary">{sessionData?.activeTime || '15'}<span className="text-sm ml-0.5">m</span></p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Exercises</p>
                <p className="font-headline text-2xl text-vs-tertiary">{sessionData?.exerciseCount || EXERCISES.length}<span className="text-sm ml-0.5">done</span></p>
              </div>
              <div>
                <p className="font-label text-[10px] uppercase tracking-widest text-vs-on-surface-variant mb-1">Neural Load</p>
                <p className="font-headline text-2xl text-vs-on-surface">Low</p>
              </div>
            </div>

            {/* Exercises done list */}
            <div className="border-t border-vs-outline-variant/10 pt-5 space-y-3">
              {EXERCISES.map((ex, i) => (
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

            <div className="border-t border-vs-outline-variant/10 pt-5 mt-4">
              <button
                onClick={onReturn}
                className="w-full font-body text-sm text-vs-primary hover:text-vs-on-surface transition-colors uppercase tracking-widest"
              >
                Return to Home
              </button>
            </div>
          </div>

          <p className="font-label text-[10px] uppercase tracking-[0.2em] text-vs-on-surface-variant/40">
            See you in the next session, Sarath.
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
  const [timeLeft, setTimeLeft] = useState(EXERCISES[0].duration)
  const [pausedSeconds, setPausedSeconds] = useState(0)
  const [sessionStartTime] = useState(Date.now())

  const currentExercise = EXERCISES[currentExerciseIndex]
  const nextExercise = EXERCISES[currentExerciseIndex + 1] || null

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

    if (currentExerciseIndex < EXERCISES.length - 1) {
      const nextIdx = currentExerciseIndex + 1
      setCurrentExerciseIndex(nextIdx)
      setTimeLeft(EXERCISES[nextIdx].duration)
    } else {
      setScreen('complete')
    }
  }, [timeLeft, screen, currentExerciseIndex])

  // ── Pause Timer (counts up during 'paused') ──
  useEffect(() => {
    if (screen !== 'paused') return

    const interval = setInterval(() => {
      setPausedSeconds(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [screen])

  // ── Handlers ──
  const handleStart = useCallback(() => {
    setScreen('countdown')
  }, [])

  const handleCountdownComplete = useCallback(() => {
    setCurrentExerciseIndex(0)
    setTimeLeft(EXERCISES[0].duration)
    setScreen('session')
  }, [])

  const handlePause = useCallback(() => {
    setPausedSeconds(0)
    setScreen('paused')
  }, [])

  const handleResume = useCallback(() => {
    setScreen('session')
  }, [])

  const handleSkipNext = useCallback(() => {
    if (currentExerciseIndex < EXERCISES.length - 1) {
      const nextIdx = currentExerciseIndex + 1
      setCurrentExerciseIndex(nextIdx)
      setTimeLeft(EXERCISES[nextIdx].duration)
    } else {
      setScreen('complete')
    }
  }, [currentExerciseIndex])

  const handleSkipPrev = useCallback(() => {
    if (currentExerciseIndex > 0) {
      const prevIdx = currentExerciseIndex - 1
      setCurrentExerciseIndex(prevIdx)
      setTimeLeft(EXERCISES[prevIdx].duration)
    }
  }, [currentExerciseIndex])

  const handleReturn = useCallback(() => {
    setScreen('intro')
    setCurrentExerciseIndex(0)
    setTimeLeft(EXERCISES[0].duration)
    setPausedSeconds(0)
  }, [])

  const sessionData = {
    activeTime: Math.round((Date.now() - sessionStartTime) / 60000),
    exerciseCount: EXERCISES.length,
  }

  // ── Render ──
  return (
    <>
      {screen === 'intro' && (
        <IntroScreen onStart={handleStart} />
      )}
      {screen === 'countdown' && (
        <CountdownScreen onComplete={handleCountdownComplete} />
      )}
      {screen === 'session' && (
        <SessionScreen
          exercise={currentExercise}
          exerciseIndex={currentExerciseIndex}
          totalExercises={EXERCISES.length}
          timeLeft={timeLeft}
          onPause={handlePause}
          onSkipNext={handleSkipNext}
          onSkipPrev={handleSkipPrev}
        />
      )}
      {screen === 'paused' && (
        <PausedScreen
          exercise={currentExercise}
          nextExercise={nextExercise}
          pausedSeconds={pausedSeconds}
          onResume={handleResume}
        />
      )}
      {screen === 'complete' && (
        <CompleteScreen
          sessionData={sessionData}
          onReturn={handleReturn}
        />
      )}
    </>
  )
}
