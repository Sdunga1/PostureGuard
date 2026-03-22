import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'Why Your Posture Gets Worse After Lunch — PostureGuard' }

export default function Blog1() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-body min-h-screen">
      <nav className="fixed top-0 w-full z-50">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto bg-[#131313]/60 backdrop-blur-xl border-b border-white/5">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-[#c3f5ff] font-headline uppercase">PostureGuard</Link>
          <Link href="/">
            <span className="font-headline text-[10px] uppercase tracking-widest text-[#e5e2e1]/40 hover:text-[#c3f5ff] transition-colors">&larr; Back to Home</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-8 pt-32 pb-32">
        {/* Hero Image */}
        <div className="relative w-full h-[400px] rounded-xl overflow-hidden mb-10">
          <Image src="/exercises/Image1.png" alt="Person slouching at desk in afternoon light" fill className="object-cover" />
        </div>

        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-[#e5e2e1] mb-4 leading-tight">
          Why Your Posture Gets Worse After Lunch
        </h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-full bg-[#c3f5ff]/20 flex items-center justify-center text-[#c3f5ff] font-bold text-xs">S</div>
          <div>
            <a href="https://www.linkedin.com/in/sarathkumardunga/" target="_blank" rel="noopener noreferrer" className="font-headline text-sm text-[#e5e2e1] hover:text-[#c3f5ff] transition-colors">Sarath</a>
            <span className="text-[#bac9cc]/40 mx-2">·</span>
            <span className="font-headline text-xs text-[#bac9cc]/50">March 20, 2026</span>
          </div>
        </div>

        <div className="space-y-6 font-body text-[#bac9cc] text-base leading-relaxed font-light">
          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">The 2pm Slump Is Real</h2>
          <p>Most people notice it around 2pm. The slouch creeps in, the neck drifts forward, and the shoulders round. It feels like fatigue, but the mechanism is more specific than that.</p>
          <p>After a meal, blood flow is redirected to aid digestion. Core muscle activation drops. The muscles responsible for keeping your spine upright - your erector spinae and deep cervical flexors - are among the first to disengage when your body is conserving energy.</p>

          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">What Happens to Your Spine</h2>
          <p>Your skeleton settles into whatever position gravity prefers. For desk workers, that means forward head posture and a collapsed lumbar curve. Over weeks and months, these micro-compromises add up to chronic pain.</p>

          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">How PostureGuard Addresses This</h2>
          <p>PostureGuard was built around this reality. The system doesn&apos;t assume your posture is static - it measures drift in real time and intervenes <span className="text-[#c3f5ff]">before</span> compensation patterns become permanent.</p>
          <p>By tracking your posture continuously through the workday, PostureGuard identifies exactly when your form begins to break down and sends gentle nudges to bring you back to baseline.</p>

          <blockquote className="border-l-2 border-[#c3f5ff]/30 pl-6 my-8 italic text-[#bac9cc]/70">
            &quot;The best posture is your next posture.&quot; - Ergonomics Research, Cornell University
          </blockquote>
        </div>
      </main>
    </div>
  )
}
