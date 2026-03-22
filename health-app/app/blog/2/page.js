import Link from 'next/link'
import Image from 'next/image'

export const metadata = { title: 'The Science Behind Posture Scoring — PostureGuard' }

export default function Blog2() {
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
          <Image src="/exercises/Image2.png" alt="Spine visualization with posture scoring data" fill className="object-cover" />
        </div>

        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-[#e5e2e1] mb-4 leading-tight">
          The Science Behind Posture Scoring
        </h1>

        {/* Author */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-full bg-[#ff9f43]/20 flex items-center justify-center text-[#ff9f43] font-bold text-xs">A</div>
          <div>
            <a href="https://www.linkedin.com/in/ashish-thanga-2252b416b/" target="_blank" rel="noopener noreferrer" className="font-headline text-sm text-[#e5e2e1] hover:text-[#c3f5ff] transition-colors">Ashish</a>
            <span className="text-[#bac9cc]/40 mx-2">·</span>
            <span className="font-headline text-xs text-[#bac9cc]/50">March 21, 2026</span>
          </div>
        </div>

        <div className="space-y-6 font-body text-[#bac9cc] text-base leading-relaxed font-light">
          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">Why Generic Standards Fail</h2>
          <p>Most posture apps compare you against a universal &quot;ideal&quot; position. The problem? Everyone&apos;s spine is different. Height, torso-to-leg ratio, shoulder width, and natural spinal curvature all vary widely.</p>
          <p>A score based on a generic template will always produce false positives for some and miss real issues in others.</p>

          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">How PostureGuard Scores You</h2>
          <p>PostureGuard uses <span className="text-[#c3f5ff]">personalized calibration</span>. During your first 30-second setup, the system captures your optimal sitting position and builds a biometric profile unique to you.</p>
          <p>From there, scoring is based on deviation from <em>your</em> baseline across three spinal regions:</p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><span className="text-[#e5e2e1]">Cervical</span> - neck tilt and forward head angle</li>
            <li><span className="text-[#e5e2e1]">Thoracic</span> - shoulder rounding and upper back curve</li>
            <li><span className="text-[#e5e2e1]">Lumbar</span> - lower back collapse and pelvic tilt</li>
          </ul>

          <h2 className="font-headline text-xl font-bold text-[#e5e2e1] mt-8">Real-Time, Not Retroactive</h2>
          <p>Unlike wearables that give you a report at the end of the day, PostureGuard processes pose data locally in your browser using Human.js and provides <span className="text-[#c3f5ff]">instant feedback</span> when deviation exceeds your personal threshold.</p>
        </div>
      </main>
    </div>
  )
}
