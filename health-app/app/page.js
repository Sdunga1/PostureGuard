import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'

// ── PostureGuard Landing Page ─────────────────────────────────────────────────
export default async function LandingPage() {
  const cookieStore = await cookies()
  const supabase = createServerSupabaseClient(cookieStore)
  const { data: { session } } = await supabase.auth.getSession()

  // Logged-in users go straight to the app — landing page is for new visitors only
  if (session) redirect('/flow')

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-body min-h-screen">

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto bg-[#131313]/60 backdrop-blur-xl border-b border-white/5">
          <div className="text-2xl font-bold tracking-tighter text-[#c3f5ff] font-headline uppercase">
            PostureGuard
          </div>
          <div className="hidden md:flex items-center space-x-12">
            <Link className="font-headline tracking-tight uppercase text-xs font-bold text-[#e5e2e1]/70 hover:text-[#c3f5ff] transition-colors" href="/blog/1">Blog</Link>
            <Link className="font-headline tracking-tight uppercase text-xs font-bold text-[#e5e2e1]/70 hover:text-[#c3f5ff] transition-colors" href="/blog/2">Research</Link>
          </div>
          <Link href="/login">
            <button className="bg-[#c3f5ff] text-[#00363d] px-6 py-2 rounded-full font-headline text-xs font-bold uppercase tracking-widest hover:bg-[#00daf3] transition-all active:scale-95 shadow-[0_0_20px_rgba(195,245,255,0.2)]">
              Sign In
            </button>
          </Link>
        </div>
      </nav>

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <main className="relative min-h-screen overflow-hidden scanline-bg pt-16">
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none hud-scanlines opacity-50" />

        {/* ── HERO ── */}
        <section className="max-w-screen-2xl mx-auto px-8 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 py-12 lg:pt-16 lg:pb-8">

          {/* Left: Content */}
          <div className="lg:col-span-6 z-10">
            <div className="inline-flex items-center space-x-3 mb-6 bg-[#c3f5ff]/5 border border-[#c3f5ff]/10 px-4 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#66d9cc] animate-pulse-soft" />
              <span className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#c3f5ff]">System Status: Optimal</span>
            </div>

            <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tighter text-[#e5e2e1] mb-4 leading-[0.9]">
              Your posture,&nbsp;<br />
              <span className="text-[#c3f5ff]/80">reimagined.</span>
            </h1>

            <p className="font-headline text-[#c3f5ff]/70 text-sm md:text-base mb-6 uppercase tracking-widest font-bold">
              For engineers, designers, and writers who sit 6+ hours a day.
            </p>

            <p className="font-body text-[#bac9cc] text-lg md:text-xl max-w-xl mb-10 leading-relaxed font-light">
              PostureGuard monitors your posture through your webcam and sends real-time nudges before pain sets in. Free during beta.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <Link href="/login">
                  <button className="bg-[#c3f5ff] text-[#00363d] px-12 py-4 rounded-full font-headline text-sm font-bold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(195,245,255,0.3)] transition-all">
                    Get Started
                  </button>
                </Link>
              </div>
              <div className="pl-1">
                <a className="text-[#bac9cc] hover:text-[#c3f5ff] transition-colors font-headline text-xs uppercase tracking-widest" href="#workflow">
                  or see how it works →
                </a>
              </div>
            </div>
          </div>

          {/* Right: Spine HUD */}
          <div className="lg:col-span-6 relative flex justify-center items-center lg:pr-12">
            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
              <div className="absolute inset-12 border-[0.5px] border-[#c3f5ff]/5 rounded-full border-dashed animate-spin-slow" />

              <svg className="w-80 h-auto drop-shadow-[0_0_20px_rgba(195,245,255,0.2)]" viewBox="0 0 200 400">
                <defs>
                  <linearGradient id="vertebraGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="rgba(195,245,255,0.1)" />
                    <stop offset="50%"  stopColor="rgba(195,245,255,0.02)" />
                    <stop offset="100%" stopColor="rgba(195,245,255,0.1)" />
                  </linearGradient>
                </defs>
                <g>
                  <line x1="100" y1="20" x2="100" y2="270" stroke="rgba(195,245,255,0.1)" strokeWidth="0.5" />
                  <g className="vertebra-anim" style={{ animationDelay: '0.1s' }}>
                    <rect x="73" y="20" width="54" height="12" rx="3" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                    <ellipse cx="100" cy="35" rx="18" ry="1.5" fill="#c3f5ff" style={{ animationDelay: '0s', transformOrigin: 'center' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.2s' }}>
                    <rect x="70" y="38" width="60" height="14" rx="3" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                    <ellipse cx="100" cy="55" rx="22" ry="1.5" fill="#c3f5ff" style={{ animationDelay: '0.1s', transformOrigin: 'center' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.3s' }}>
                    <rect x="67" y="58" width="66" height="16" rx="4" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                    <ellipse cx="100" cy="78" rx="26" ry="1.5" fill="#c3f5ff" style={{ animationDelay: '0.2s', transformOrigin: 'center' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.4s' }}>
                    <rect x="63" y="82" width="74" height="20" rx="4" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                    <ellipse cx="100" cy="105" rx="30" ry="2" fill="#c3f5ff" style={{ animationDelay: '0.3s', transformOrigin: 'center' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.5s' }}>
                    <rect x="59" y="110" width="82" height="24" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                    <ellipse cx="100" cy="138" rx="34" ry="2" fill="#c3f5ff" style={{ animationDelay: '0.4s', transformOrigin: 'center' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.6s' }}>
                    <rect x="55" y="145" width="90" height="28" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                    <ellipse cx="100" cy="178" rx="38" ry="2.5" fill="#c3f5ff" style={{ animationDelay: '0.5s', transformOrigin: 'center' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.7s' }}>
                    <rect x="50" y="185" width="100" height="32" rx="6" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                    <ellipse cx="100" cy="222" rx="42" ry="3" fill="#c3f5ff" style={{ animationDelay: '0.6s', transformOrigin: 'center' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.8s' }}>
                    <rect x="45" y="230" width="110" height="38" rx="6" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="1" />
                  </g>
                  <path d="M127 26 L165 26" fill="none" stroke="#c3f5ff" strokeDasharray="2 2" strokeWidth="0.5" />
                  <circle cx="127" cy="26" r="1.5" fill="#c3f5ff" />
                  <path d="M150 201 L180 201" fill="none" stroke="#c3f5ff" strokeDasharray="2 2" strokeWidth="0.5" />
                  <circle cx="150" cy="201" r="1.5" fill="#c3f5ff" />
                  <path d="M155 249 L185 249" fill="none" stroke="#c3f5ff" strokeDasharray="2 2" strokeWidth="0.5" />
                  <circle cx="155" cy="249" r="1.5" fill="#c3f5ff" />
                  <path d="M155 268 L175 268" fill="none" stroke="#c3f5ff" strokeDasharray="2 2" strokeWidth="0.5" />
                  <circle cx="155" cy="268" r="1.5" fill="#c3f5ff" />
                </g>
              </svg>

              <div className="absolute top-16 right-4 font-headline text-[10px] tracking-widest text-[#c3f5ff] bg-[#131313]/80 backdrop-blur px-3 py-1 border-l-2 border-[#c3f5ff] shadow-[0_0_15px_rgba(195,245,255,0.1)]">
                CERVICAL ●──── 94%
              </div>
              <div className="absolute bottom-48 right-0 font-headline text-[10px] tracking-widest text-[#983c1e] bg-[#ffc3b1]/10 backdrop-blur px-3 py-1 border-l-2 border-[#983c1e] shadow-[0_0_15px_rgba(152,60,30,0.2)]">
                LUMBAR ●──── 72% <span className="text-xs font-bold">⚠</span>
              </div>
              <div className="absolute bottom-32 right-0 font-headline text-[10px] tracking-widest text-[#66d9cc] bg-[#66d9cc]/10 backdrop-blur px-3 py-1 border-l-2 border-[#66d9cc] shadow-[0_0_15px_rgba(102,217,204,0.1)]">
                SACRAL ●──── 88%
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-96 bg-[#c3f5ff]/10 blur-[80px] rounded-full -z-10" />
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <section className="max-w-screen-2xl mx-auto px-8 md:px-16 py-16 border-y border-white/5 bg-[#0e0e0e]/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <h4 className="font-headline text-4xl font-bold text-[#c3f5ff] mb-2">65%</h4>
              <p className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#bac9cc]">of desk workers develop back pain</p>
            </div>
            <div>
              <h4 className="font-headline text-4xl font-bold text-[#66d9cc] mb-2">9+ Hours</h4>
              <p className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#bac9cc]">average daily sitting</p>
            </div>
            <div>
              <h4 className="font-headline text-4xl font-bold text-[#c3f5ff] mb-2">$86B</h4>
              <p className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#bac9cc]">spent annually on back pain in the US</p>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="workflow" className="max-w-screen-2xl mx-auto px-8 md:px-16 py-32">
          <div className="text-center mb-24">
            <h2 className="font-headline text-sm uppercase tracking-[0.4em] text-[#c3f5ff]/60 font-bold mb-4">How it works</h2>
            <div className="w-12 h-px bg-[#c3f5ff]/30 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: '01', title: 'Install Extension', body: 'No hardware required. PostureGuard runs entirely in your browser. Local processing ensures your camera never leaves your machine.' },
              { n: '02', title: 'Calibrate Once', body: "Sit how you naturally should for 30 seconds. That's your baseline — everything is measured against you, not a generic standard." },
              { n: '03', title: 'Work Normally', body: 'The extension watches your posture in the background and nudges you when you drift. No interruptions unless you need one.' },
              { n: '04', title: 'Recover with Purpose', body: 'End your session, get an AI report of exactly what went wrong, and a set of exercises picked for your specific problem areas.' },
            ].map(({ n, title, body }) => (
              <div key={n} className="group relative bg-[#0e0e0e] border border-white/5 p-8 transition-all hover:border-[#c3f5ff]/30 hover:bg-[#1c1b1b] cursor-default">
                <div className="font-headline text-6xl font-bold text-[#c3f5ff]/10 mb-6 group-hover:text-[#c3f5ff]/20 transition-colors">{n}</div>
                <h3 className="font-headline text-sm font-bold text-[#c3f5ff] mb-3 uppercase tracking-widest">{title}</h3>
                <p className="font-body text-[#bac9cc] text-xs font-light leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CORE PROTOCOLS ── */}
        <section className="max-w-screen-2xl mx-auto px-8 md:px-16 pb-32">
          <div className="text-center mb-16">
            <h2 className="font-headline text-xs uppercase tracking-[0.4em] text-[#c3f5ff]/60 font-bold mb-4">Core Protocols</h2>
            <div className="w-12 h-px bg-[#c3f5ff]/30 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative bg-[#1c1b1b] p-8 border-l-2 border-[#66d9cc] transition-all hover:bg-[#2a2a2a] cursor-default">
              <div className="flex justify-between items-start mb-12">
                <div className="bg-[#66d9cc]/10 p-3 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9.5 14.5L3 21M3 3v5l2 2M21 3h-5l-2 2M21 21l-6-6m0 0l-1.5-1.5M15 15l1.5 1.5M9 9l1.5 1.5M9 9l6-6M9 9L3 15" stroke="#66d9cc" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#66d9cc] animate-pulse-soft" />
                  <span className="font-headline text-[9px] uppercase tracking-tighter text-[#66d9cc]/60">Live Monitoring</span>
                </div>
              </div>
              <h3 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3 uppercase tracking-tight">Real-Time Detection</h3>
              <p className="font-body text-[#bac9cc] text-sm font-light leading-relaxed">Detects slouching via your webcam in real time.</p>
              <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href="/login" className="text-[#66d9cc] font-headline text-[10px] uppercase tracking-widest hover:underline underline-offset-4">Get Started →</Link>
              </div>
            </div>

            <div className="group relative bg-[#1c1b1b] p-8 border-l-2 border-[#c3f5ff] transition-all hover:bg-[#2a2a2a] cursor-default">
              <div className="flex justify-between items-start mb-12">
                <div className="bg-[#c3f5ff]/10 p-3 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c3f5ff" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c3f5ff] animate-pulse-soft" />
                  <span className="font-headline text-[9px] uppercase tracking-tighter text-[#c3f5ff]/60">Active Engine</span>
                </div>
              </div>
              <h3 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3 uppercase tracking-tight">AI Coaching</h3>
              <p className="font-body text-[#bac9cc] text-sm font-light leading-relaxed">Get gentle AI-powered reminders to fix your sitting position.</p>
              <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href="/login" className="text-[#c3f5ff] font-headline text-[10px] uppercase tracking-widest hover:underline underline-offset-4">Get Started →</Link>
              </div>
            </div>

            <div className="group relative bg-[#1c1b1b] p-8 border-l-2 border-[#c3f5ff] transition-all hover:bg-[#2a2a2a] cursor-default">
              <div className="flex justify-between items-start mb-12">
                <div className="bg-[#c3f5ff]/10 p-3 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c3f5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19V5a2 2 0 012-2h8.5L18 6.5V19a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
                    <polyline points="14 3 14 8 19 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="13" y2="17" />
                  </svg>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c3f5ff] animate-pulse-soft" />
                  <span className="font-headline text-[9px] uppercase tracking-tighter text-[#c3f5ff]/60">Protocol Ready</span>
                </div>
              </div>
              <h3 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3 uppercase tracking-tight">Recovery Sessions</h3>
              <p className="font-body text-[#bac9cc] text-sm font-light leading-relaxed">Access guided stretches to reverse the effects of sitting.</p>
              <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href="/login" className="text-[#c3f5ff] font-headline text-[10px] uppercase tracking-widest hover:underline underline-offset-4">Get Started →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="w-full bg-[#c3f5ff]/5 border-y border-[#c3f5ff]/10 py-32 px-8 mb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-headline text-5xl md:text-7xl font-bold tracking-tighter text-[#e5e2e1] mb-8 uppercase">Ready to realign?</h2>
            <p className="font-body text-[#bac9cc] text-lg mb-12 max-w-xl mx-auto font-light leading-relaxed">
              Be among the first to fix your posture for good.
            </p>
            <Link href="/login">
              <button className="bg-[#c3f5ff] text-[#00363d] px-16 py-5 rounded-full font-headline text-base font-bold uppercase tracking-widest hover:shadow-[0_0_40px_rgba(195,245,255,0.4)] transition-all transform hover:-translate-y-1">
                Get Started
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="w-full border-t border-[#3b494c]/15 bg-[#0e0e0e]">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full max-w-screen-2xl mx-auto">
          <div className="text-[#c3f5ff] font-bold font-headline tracking-widest mb-4 md:mb-0">
            POSTUREGUARD
          </div>
          <div className="font-headline text-[10px] tracking-[0.05em] uppercase text-[#e5e2e1]/50 mb-4 md:mb-0">
            © 2026 POSTUREGUARD.
          </div>
          <div className="flex space-x-8">
            <Link className="font-headline text-[10px] tracking-[0.05em] uppercase text-[#e5e2e1]/40 hover:text-[#c3f5ff] transition-colors" href="/blog/1">Blog</Link>
            <Link className="font-headline text-[10px] tracking-[0.05em] uppercase text-[#e5e2e1]/40 hover:text-[#c3f5ff] transition-colors" href="/blog/2">Research</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
