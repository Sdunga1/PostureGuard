import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'How AI Is Reshaping Ergonomic Health — PostureGuard' }

export default function Blog3() {
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
          <Image src="/exercises/Image3.png" alt="AI-powered ergonomic workspace with holographic detection" fill className="object-cover" />
        </div>

        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-[#e5e2e1] mb-4 leading-tight">
          How AI Is Reshaping Ergonomic Health
        </h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-full bg-[#c3f5ff]/20 flex items-center justify-center text-[#c3f5ff] font-bold text-xs">S</div>
          <div>
            <a href="https://www.linkedin.com/in/sarathkumardunga/" target="_blank" rel="noopener noreferrer" className="font-headline text-sm text-[#e5e2e1] hover:text-[#c3f5ff] transition-colors">Sarath</a>
            <span className="text-[#bac9cc]/40 mx-2">·</span>
            <span className="font-headline text-xs text-[#bac9cc]/50">March 22, 2026</span>
          </div>
        </div>

        <div className="space-y-6 font-body text-[#bac9cc] text-base leading-relaxed font-light">
          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">Beyond the Standing Desk</h2>
          <p>The ergonomics industry has relied on hardware for decades - standing desks, lumbar pillows, monitor arms. These tools help, but they&apos;re passive. They don&apos;t know if you&apos;re using them correctly.</p>
          <p>AI changes this equation. With computer vision and pose estimation running directly in the browser, software can now understand <em>how</em> you sit, not just <em>what</em> you sit on.</p>

          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">The Privacy-First Approach</h2>
          <p>The biggest concern with AI-powered health tools is data privacy. PostureGuard addresses this head-on:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><span className="text-[#c3f5ff]">On-device processing</span> - camera frames never leave your browser</li>
            <li><span className="text-[#c3f5ff]">Metrics only</span> - only angles and scores are sent to Claude AI for coaching</li>
            <li><span className="text-[#c3f5ff]">User control</span> - start, pause, or stop detection at any time</li>
          </ul>

          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">What&apos;s Next</h2>
          <p>As AI models become more efficient, real-time health monitoring through everyday devices will become the norm. The future of ergonomics isn&apos;t better chairs - it&apos;s smarter software that meets you where you already work.</p>
        </div>
      </main>
    </div>
  )
}
