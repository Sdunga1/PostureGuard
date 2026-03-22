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
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="26" stroke="url(#navGrad)" strokeWidth="1.5" opacity="0.3"/>
              <circle cx="28" cy="28" r="20" stroke="url(#navGrad)" strokeWidth="1.5" opacity="0.5"/>
              <circle cx="28" cy="28" r="14" stroke="url(#navGrad)" strokeWidth="2"/>
              <circle cx="28" cy="28" r="4" fill="#c3f5ff"/>
              <defs><linearGradient id="navGrad" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#c3f5ff"/><stop offset="100%" stopColor="#66d9cc"/></linearGradient></defs>
            </svg>
            <span className="text-2xl font-bold tracking-tighter text-[#c3f5ff] font-headline uppercase">PostureGuard</span>
          </div>
          <div className="hidden md:flex items-center space-x-12">
            <a className="font-headline tracking-tight uppercase text-xs font-bold text-[#c3f5ff] border-b-2 border-[#c3f5ff] pb-1" href="#home">Home</a>
            <a className="font-headline tracking-tight uppercase text-xs font-bold text-[#e5e2e1]/70 hover:text-[#c3f5ff] transition-colors" href="#stats">Stats</a>
            <a className="font-headline tracking-tight uppercase text-xs font-bold text-[#e5e2e1]/70 hover:text-[#c3f5ff] transition-colors" href="#workflow">Workflow</a>
            <a className="font-headline tracking-tight uppercase text-xs font-bold text-[#e5e2e1]/70 hover:text-[#c3f5ff] transition-colors" href="#core">Core</a>
            <a className="font-headline tracking-tight uppercase text-xs font-bold text-[#e5e2e1]/70 hover:text-[#c3f5ff] transition-colors" href="#blogs">Blogs</a>
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
        <section id="home" className="max-w-screen-2xl mx-auto px-8 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 py-12 lg:pt-16 lg:pb-8">

          {/* Left: Content */}
          <div className="lg:col-span-6 z-10">
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
                <Link href="/privacy" className="text-[#bac9cc] hover:text-[#c3f5ff] transition-colors font-headline text-xs uppercase tracking-widest">
                  Review Privacy Protocol →
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Spine HUD */}
          <div className="lg:col-span-6 relative flex justify-center items-center lg:pr-12">
            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
              {/* Rotating ring */}
              <div className="absolute inset-12 border-[0.5px] border-[#c3f5ff]/5 rounded-full border-dashed animate-spin-slow" />

              {/* SVG Spine — S-curved with lordosis (cervical/lumbar) & kyphosis (thoracic) */}
              <svg className="w-80 h-auto drop-shadow-[0_0_20px_rgba(195,245,255,0.2)]" viewBox="0 0 260 520">
                <defs>
                  <linearGradient id="vertebraGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="rgba(195,245,255,0.12)" />
                    <stop offset="50%"  stopColor="rgba(195,245,255,0.03)" />
                    <stop offset="100%" stopColor="rgba(195,245,255,0.12)" />
                  </linearGradient>
                  <linearGradient id="lumbarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%"   stopColor="rgba(255,107,74,0.1)" />
                    <stop offset="50%"  stopColor="rgba(255,107,74,0.02)" />
                    <stop offset="100%" stopColor="rgba(255,107,74,0.1)" />
                  </linearGradient>
                </defs>
                <g>
                  {/* S-curve spine line */}
                  <path d="M148 15 C158 60, 155 80, 140 120 C125 160, 115 200, 110 240 C108 270, 120 310, 145 360 C155 380, 148 420, 140 470" fill="none" stroke="rgba(195,245,255,0.08)" strokeWidth="0.5" />

                  {/* ── Cervical C1-C5 (lordotic curve — offsets right) ── */}
                  <g className="vertebra-anim" style={{ animationDelay: '0.05s' }}>
                    <rect x="126" y="12" width="42" height="10" rx="4" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.9" />
                    <ellipse cx="147" cy="24" rx="14" ry="1.2" fill="#c3f5ff" opacity="0.15" className="animate-disc-pulse" style={{ animationDelay: '0s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.1s' }}>
                    <rect x="123" y="28" width="48" height="11" rx="4" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.9" />
                    <ellipse cx="147" cy="41" rx="17" ry="1.2" fill="#c3f5ff" opacity="0.15" className="animate-disc-pulse" style={{ animationDelay: '0.05s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.15s' }}>
                    <rect x="119" y="45" width="54" height="12" rx="4" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.9" />
                    <ellipse cx="146" cy="59" rx="20" ry="1.3" fill="#c3f5ff" opacity="0.15" className="animate-disc-pulse" style={{ animationDelay: '0.1s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.2s' }}>
                    <rect x="114" y="63" width="60" height="13" rx="4" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.9" />
                    <ellipse cx="144" cy="78" rx="23" ry="1.3" fill="#c3f5ff" opacity="0.15" className="animate-disc-pulse" style={{ animationDelay: '0.15s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.25s' }}>
                    <rect x="108" y="82" width="66" height="14" rx="4" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.85" />
                    <ellipse cx="141" cy="98" rx="26" ry="1.4" fill="#c3f5ff" opacity="0.15" className="animate-disc-pulse" style={{ animationDelay: '0.2s' }} />
                  </g>

                  {/* ── Thoracic T1-T6 (kyphotic curve — offsets left) ── */}
                  <g className="vertebra-anim" style={{ animationDelay: '0.3s' }}>
                    <rect x="100" y="102" width="72" height="16" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.8" />
                    <ellipse cx="136" cy="120" rx="28" ry="1.5" fill="#c3f5ff" opacity="0.12" className="animate-disc-pulse" style={{ animationDelay: '0.25s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.35s' }}>
                    <rect x="93" y="124" width="78" height="17" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.8" />
                    <ellipse cx="132" cy="143" rx="30" ry="1.5" fill="#c3f5ff" opacity="0.12" className="animate-disc-pulse" style={{ animationDelay: '0.3s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.4s' }}>
                    <rect x="87" y="147" width="84" height="18" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.75" />
                    <ellipse cx="129" cy="167" rx="32" ry="1.6" fill="#c3f5ff" opacity="0.12" className="animate-disc-pulse" style={{ animationDelay: '0.35s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.45s' }}>
                    <rect x="83" y="171" width="88" height="19" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.75" />
                    <ellipse cx="127" cy="192" rx="34" ry="1.6" fill="#c3f5ff" opacity="0.12" className="animate-disc-pulse" style={{ animationDelay: '0.4s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.5s' }}>
                    <rect x="80" y="196" width="92" height="20" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.7" />
                    <ellipse cx="126" cy="218" rx="36" ry="1.7" fill="#c3f5ff" opacity="0.1" className="animate-disc-pulse" style={{ animationDelay: '0.45s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.55s' }}>
                    <rect x="79" y="222" width="96" height="21" rx="5" fill="url(#vertebraGradient)" stroke="#c3f5ff" strokeWidth="0.8" opacity="0.7" />
                    <ellipse cx="127" cy="245" rx="38" ry="1.8" fill="#c3f5ff" opacity="0.1" className="animate-disc-pulse" style={{ animationDelay: '0.5s' }} />
                  </g>

                  {/* ── Lumbar L1-L4 (lordotic curve — offsets right, warning color) ── */}
                  <g className="vertebra-anim" style={{ animationDelay: '0.6s' }}>
                    <rect x="84" y="250" width="100" height="24" rx="6" fill="url(#lumbarGradient)" stroke="#ff6b4a" strokeWidth="0.8" opacity="0.8" />
                    <ellipse cx="134" cy="277" rx="40" ry="2" fill="#ff6b4a" opacity="0.1" className="animate-disc-pulse" style={{ animationDelay: '0.55s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.65s' }}>
                    <rect x="92" y="281" width="108" height="27" rx="6" fill="url(#lumbarGradient)" stroke="#ff6b4a" strokeWidth="0.8" opacity="0.8" />
                    <ellipse cx="146" cy="311" rx="42" ry="2.2" fill="#ff6b4a" opacity="0.1" className="animate-disc-pulse" style={{ animationDelay: '0.6s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.7s' }}>
                    <rect x="99" y="315" width="114" height="30" rx="6" fill="url(#lumbarGradient)" stroke="#ff6b4a" strokeWidth="0.8" opacity="0.8" />
                    <ellipse cx="156" cy="348" rx="44" ry="2.4" fill="#ff6b4a" opacity="0.1" className="animate-disc-pulse" style={{ animationDelay: '0.65s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.75s' }}>
                    <rect x="103" y="352" width="118" height="32" rx="6" fill="url(#lumbarGradient)" stroke="#ff6b4a" strokeWidth="0.8" opacity="0.75" />
                    <ellipse cx="162" cy="387" rx="46" ry="2.5" fill="#ff6b4a" opacity="0.08" className="animate-disc-pulse" style={{ animationDelay: '0.7s' }} />
                  </g>

                  {/* ── Sacral S1-S2 (curves back) ── */}
                  <g className="vertebra-anim" style={{ animationDelay: '0.8s' }}>
                    <rect x="96" y="392" width="112" height="28" rx="6" fill="url(#vertebraGradient)" stroke="#66d9cc" strokeWidth="0.8" opacity="0.7" />
                    <ellipse cx="152" cy="423" rx="42" ry="2" fill="#66d9cc" opacity="0.1" className="animate-disc-pulse" style={{ animationDelay: '0.75s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.85s' }}>
                    <rect x="89" y="427" width="102" height="25" rx="6" fill="url(#vertebraGradient)" stroke="#66d9cc" strokeWidth="0.8" opacity="0.65" />
                    <ellipse cx="140" cy="455" rx="38" ry="1.8" fill="#66d9cc" opacity="0.08" className="animate-disc-pulse" style={{ animationDelay: '0.8s' }} />
                  </g>
                  <g className="vertebra-anim" style={{ animationDelay: '0.9s' }}>
                    <rect x="84" y="459" width="88" height="20" rx="6" fill="url(#vertebraGradient)" stroke="#66d9cc" strokeWidth="0.8" opacity="0.6" />
                  </g>

                  {/* HUD Connectors */}
                  <path d="M168 17 L210 17" fill="none" stroke="#c3f5ff" strokeDasharray="2 2" strokeWidth="0.5" />
                  <circle cx="168" cy="17" r="1.5" fill="#c3f5ff" />
                  <path d="M200 340 L230 340" fill="none" stroke="#ff6b4a" strokeDasharray="2 2" strokeWidth="0.5" />
                  <circle cx="200" cy="340" r="1.5" fill="#ff6b4a" />
                  <path d="M198 440 L228 440" fill="none" stroke="#66d9cc" strokeDasharray="2 2" strokeWidth="0.5" />
                  <circle cx="198" cy="440" r="1.5" fill="#66d9cc" />
                </g>
              </svg>

              {/* Readout: CERVICAL */}
              <div className="absolute top-8 right-0 font-headline text-[10px] tracking-widest text-[#c3f5ff] bg-[#131313]/80 backdrop-blur px-3 py-1 border-l-2 border-[#c3f5ff] shadow-[0_0_15px_rgba(195,245,255,0.1)]">
                CERVICAL ●──── 94%
              </div>
              {/* Readout: LUMBAR */}
              <div className="absolute bottom-36 right-0 font-headline text-[10px] tracking-widest text-[#ff6b4a] bg-[#ff6b4a]/10 backdrop-blur px-3 py-1 border-l-2 border-[#ff6b4a] shadow-[0_0_15px_rgba(255,107,74,0.15)]">
                LUMBAR ●──── 72% <span className="text-xs font-bold">⚠</span>
              </div>
              {/* Readout: SACRAL */}
              <div className="absolute bottom-20 right-0 font-headline text-[10px] tracking-widest text-[#66d9cc] bg-[#66d9cc]/10 backdrop-blur px-3 py-1 border-l-2 border-[#66d9cc] shadow-[0_0_15px_rgba(102,217,204,0.1)]">
                SACRAL ●──── 88%
              </div>

              {/* Ambient glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-96 bg-[#c3f5ff]/10 blur-[80px] rounded-full -z-10" />
            </div>
          </div>
        </section>

        {/* ── STATS STRIP ── */}
        <section id="stats" className="max-w-screen-2xl mx-auto px-8 md:px-16 py-16 border-y border-white/5 bg-[#0e0e0e]/30">
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

        {/* ── THE WORKFLOW ── */}
        <section id="workflow" className="max-w-screen-2xl mx-auto px-8 md:px-16 py-32">
          <div className="text-center mb-24">
            <h2 className="font-headline text-sm uppercase tracking-[0.4em] text-[#c3f5ff]/60 font-bold mb-4">The Workflow</h2>
            <div className="w-12 h-px bg-[#c3f5ff]/30 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: '01', title: 'Install Extension', body: 'No hardware required. PostureGuard runs entirely in your browser. Local processing ensures privacy.' },
              { n: '02', title: 'Calibrate Baseline', body: 'Sit in your optimal position for 30 seconds. This creates a personalized biometric profile.' },
              { n: '03', title: 'Passive Monitor', body: 'Work as normal. Receive subtle HUD-style nudges when the system detects spinal deviation.' },
              { n: '04', title: 'Analyze & Heal', body: "Get AI-driven insights into your sitting habits and specialized recovery routines at the day's end." },
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
        <section id="core" className="max-w-screen-2xl mx-auto px-8 md:px-16 pb-32">
          <div className="text-center mb-16">
            <h2 className="font-headline text-xs uppercase tracking-[0.4em] text-[#c3f5ff]/60 font-bold mb-4">Core Protocols</h2>
            <div className="w-12 h-px bg-[#c3f5ff]/30 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group relative bg-[#1c1b1b] p-8 border-l-2 border-[#66d9cc] transition-all hover:bg-[#2a2a2a] cursor-default">
              <div className="flex justify-between items-start mb-12">
                <div className="bg-[#66d9cc]/10 p-3 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9.5 14.5L3 21M3 3v5l2 2M21 3h-5l-2 2M21 21l-6-6m0 0l-1.5-1.5M15 15l1.5 1.5M9 9l1.5 1.5M9 9l6-6M9 9L3 15" stroke="#66d9cc" strokeWidth="1.5" strokeLinecap="round" fill="none" />
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
                <Link href="/login" className="text-[#66d9cc] font-headline text-[10px] uppercase tracking-widest hover:underline underline-offset-4">Initialize Scan →</Link>
              </div>
            </div>
            {/* Card 2 */}
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
                <Link href="/login" className="text-[#c3f5ff] font-headline text-[10px] uppercase tracking-widest hover:underline underline-offset-4">Access Core →</Link>
              </div>
            </div>
            {/* Card 3 */}
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
                <Link href="/login" className="text-[#c3f5ff] font-headline text-[10px] uppercase tracking-widest hover:underline underline-offset-4">Load Session →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── BLOGS ── */}
        <section id="blogs" className="max-w-screen-2xl mx-auto px-8 md:px-16 pb-32">
          <div className="text-center mb-16">
            <h2 className="font-headline text-xs uppercase tracking-[0.4em] text-[#c3f5ff]/60 font-bold mb-4">From the Blog</h2>
            <div className="w-12 h-px bg-[#c3f5ff]/30 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/blog/1" className="group relative bg-[#1c1b1b] p-8 border border-white/5 transition-all hover:border-[#c3f5ff]/30 hover:bg-[#2a2a2a] cursor-pointer block">
              <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#c3f5ff]/50 mb-4">March 2026 · 4 min read</div>
              <h3 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3 uppercase tracking-tight group-hover:text-[#c3f5ff] transition-colors">Why Your Posture Gets Worse After Lunch</h3>
              <p className="font-body text-[#bac9cc] text-sm font-light leading-relaxed">Most people notice it around 2pm. The slouch creeps in, the neck drifts forward, and the shoulders round.</p>
              <div className="mt-6 font-headline text-[10px] uppercase tracking-widest text-[#c3f5ff] opacity-0 group-hover:opacity-100 transition-opacity">Read Article →</div>
            </Link>
            <Link href="/blog/2" className="group relative bg-[#1c1b1b] p-8 border border-white/5 transition-all hover:border-[#c3f5ff]/30 hover:bg-[#2a2a2a] cursor-pointer block">
              <div className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#c3f5ff]/50 mb-4">March 2026 · 6 min read</div>
              <h3 className="font-headline text-xl font-bold text-[#e5e2e1] mb-3 uppercase tracking-tight group-hover:text-[#c3f5ff] transition-colors">The Science Behind Posture Scoring</h3>
              <p className="font-body text-[#bac9cc] text-sm font-light leading-relaxed">Generic posture standards don&apos;t account for individual variation. PostureGuard takes a different approach.</p>
              <div className="mt-6 font-headline text-[10px] uppercase tracking-widest text-[#c3f5ff] opacity-0 group-hover:opacity-100 transition-opacity">Read Article →</div>
            </Link>
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
            © 2026 POSTUREGUARD. PRECISION BIOMETRICS.
          </div>
          <div className="flex space-x-8">
            <Link href="/privacy" className="font-headline text-[10px] tracking-[0.05em] uppercase text-[#e5e2e1]/40 hover:text-[#c3f5ff] transition-colors">Privacy Protocol</Link>
            <a className="font-headline text-[10px] tracking-[0.05em] uppercase text-[#e5e2e1]/40 hover:text-[#c3f5ff] transition-colors" href="#">Neural Terms</a>
            <a className="font-headline text-[10px] tracking-[0.05em] uppercase text-[#e5e2e1]/40 hover:text-[#c3f5ff] transition-colors" href="#">System Status</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
