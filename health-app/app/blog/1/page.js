import Link from 'next/link'

export const metadata = { title: 'Why Your Posture Gets Worse After Lunch — PostureGuard' }

export default function Blog1() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-body min-h-screen">
      <nav className="fixed top-0 w-full z-50">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto bg-[#131313]/60 backdrop-blur-xl border-b border-white/5">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-[#c3f5ff] font-headline uppercase">PostureGuard</Link>
          <Link href="/login">
            <button className="bg-[#c3f5ff] text-[#00363d] px-6 py-2 rounded-full font-headline text-xs font-bold uppercase tracking-widest hover:bg-[#00daf3] transition-all active:scale-95">
              Sign In
            </button>
          </Link>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-8 pt-40 pb-32">
        <div className="font-headline text-[10px] uppercase tracking-[0.3em] text-[#c3f5ff]/50 mb-6">PostureGuard Blog</div>
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-[#e5e2e1] mb-6 leading-tight">
          Why Your Posture Gets Worse After Lunch
        </h1>
        <p className="font-headline text-[10px] uppercase tracking-widest text-[#bac9cc]/50 mb-12">March 2026 · 4 min read</p>

        <div className="space-y-6 font-body text-[#bac9cc] text-base leading-relaxed font-light">
          <p>Most people notice it around 2pm. The slouch creeps in, the neck drifts forward, and the shoulders round. It feels like fatigue, but the mechanism is more specific than that.</p>
          <p>After a meal, blood flow is redirected to aid digestion. Core muscle activation drops. The muscles responsible for keeping your spine upright — your erector spinae and deep cervical flexors — are among the first to disengage when your body is conserving energy.</p>
          <p>The result: your skeleton settles into whatever position gravity prefers. For desk workers, that means forward head posture and a collapsed lumbar curve.</p>
          <p>PostureGuard was built around this reality. The system doesn&apos;t assume your posture is static — it measures drift in real time and intervenes before compensation patterns become permanent.</p>
          <p>The fix isn&apos;t willpower. It&apos;s feedback at the right moment.</p>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5">
          <Link href="/" className="font-headline text-xs uppercase tracking-widest text-[#c3f5ff] hover:underline underline-offset-4">← Back to PostureGuard</Link>
        </div>
      </main>
    </div>
  )
}
