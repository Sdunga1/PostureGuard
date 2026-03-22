import Link from 'next/link'

export const metadata = { title: 'The Science Behind Posture Scoring — PostureGuard Research' }

export default function Blog2() {
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
        <div className="font-headline text-[10px] uppercase tracking-[0.3em] text-[#c3f5ff]/50 mb-6">PostureGuard Research</div>
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-[#e5e2e1] mb-6 leading-tight">
          The Science Behind Posture Scoring
        </h1>
        <p className="font-headline text-[10px] uppercase tracking-widest text-[#bac9cc]/50 mb-12">March 2026 · 6 min read</p>

        <div className="space-y-6 font-body text-[#bac9cc] text-base leading-relaxed font-light">
          <p>Generic posture standards don&apos;t account for individual variation. A 5&apos;4&quot; person sitting at a desk has a structurally different neutral spine than a 6&apos;2&quot; person — yet most posture apps use the same reference angles for both.</p>
          <p>PostureGuard takes a different approach. During calibration, the system captures your personal neutral baseline using MediaPipe Face Mesh (468 facial landmarks) and MoveNet body keypoints (17 skeletal positions). Every score after that is a deviation from your baseline, not a deviation from a population average.</p>
          <p>The scoring model is weighted across four dimensions: head tilt (35%), forward lean (20%), lateral symmetry (30%), and screen distance (15%). When body tracking data is available, shoulder angle and trunk lean are factored in, and the weights rebalance accordingly.</p>
          <p>This approach is informed by RULA (Rapid Upper Limb Assessment) and REBA (Rapid Entire Body Assessment) frameworks used in occupational health — adapted for continuous passive monitoring rather than point-in-time clinical observation.</p>
          <p>The result is a score that means something specific to you, not to a hypothetical average user.</p>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5">
          <Link href="/" className="font-headline text-xs uppercase tracking-widest text-[#c3f5ff] hover:underline underline-offset-4">← Back to PostureGuard</Link>
        </div>
      </main>
    </div>
  )
}
