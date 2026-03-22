'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const privacySegments = [
  { text: 'We designed PostureGuard ', type: 'plain' },
  { text: 'PRIVACY-FIRST', type: 'highlight' },
  { text: '. The camera never leaves your browser - we use ', type: 'plain' },
  { text: 'on-device pose detection', type: 'bold' },
  { text: ' and only send numerical metrics like angles and scores to Claude for coaching. No video, no images, no biometric data hits any server. This aligns with ', type: 'plain' },
  { text: "HIPAA's minimum necessary principle", type: 'bold' },
  { text: " - we only process what's needed and nothing more. The user has ", type: 'plain' },
  { text: 'full control', type: 'bold' },
  { text: ' to start or stop detection at any time. All authentication is handled through ', type: 'plain' },
  { text: 'secure OAuth 2.0', type: 'bold' },
  { text: ' and the extension follows ', type: 'plain' },
  { text: "Chrome's Content Security Policy (CSP)", type: 'bold' },
  { text: ' principles to prevent unauthorized data access.', type: 'plain' },
]

const fullText = privacySegments.map(s => s.text).join('')
const attribution = '— Team PostureGuard'

function TypewriterText({ speed = 60, onComplete }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (count >= fullText.length) {
      if (onComplete) onComplete()
      return
    }
    const timer = setTimeout(() => setCount(c => c + 1), speed)
    return () => clearTimeout(timer)
  }, [count, speed, onComplete])

  // Map character index to segment formatting
  let consumed = 0
  const spans = []
  for (const seg of privacySegments) {
    const segStart = consumed
    const segEnd = consumed + seg.text.length
    consumed = segEnd
    if (segStart >= count) break
    const visible = seg.text.slice(0, Math.min(seg.text.length, count - segStart))
    if (!visible) break
    spans.push({ text: visible, type: seg.type, key: segStart })
  }

  const done = count >= fullText.length

  return (
    <span>
      {spans.map(s => {
        if (s.type === 'highlight') return <span key={s.key} className="text-[#c3f5ff] font-bold tracking-wide">{s.text}</span>
        if (s.type === 'bold') return <span key={s.key} className="text-[#e5e2e1] font-semibold">{s.text}</span>
        return <span key={s.key}>{s.text}</span>
      })}
      {!done && <span className="inline-block w-[2px] h-[1.2em] bg-[#c3f5ff] ml-1 animate-pulse align-text-bottom" />}
    </span>
  )
}

function TypewriterAttribution({ speed = 60 }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (count >= attribution.length) return
    const timer = setTimeout(() => setCount(c => c + 1), speed)
    return () => clearTimeout(timer)
  }, [count, speed])

  const done = count >= attribution.length

  return (
    <span>
      {attribution.slice(0, count)}
      {!done && <span className="inline-block w-[2px] h-[1em] bg-[#c3f5ff]/50 ml-0.5 animate-pulse align-text-bottom" />}
    </span>
  )
}

export default function PrivacyPage() {
  const [started, setStarted] = useState(false)
  const [paragraphDone, setParagraphDone] = useState(false)

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-[#e5e2e1] flex flex-col">
      <nav className="flex justify-between items-center px-8 py-5 max-w-screen-xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-3">
          <svg width="24" height="24" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="url(#privNavGrad)" strokeWidth="1.5" opacity="0.3"/>
            <circle cx="28" cy="28" r="20" stroke="url(#privNavGrad)" strokeWidth="1.5" opacity="0.5"/>
            <circle cx="28" cy="28" r="14" stroke="url(#privNavGrad)" strokeWidth="2"/>
            <circle cx="28" cy="28" r="4" fill="#c3f5ff"/>
            <defs><linearGradient id="privNavGrad" x1="0" y1="0" x2="56" y2="56"><stop offset="0%" stopColor="#c3f5ff"/><stop offset="100%" stopColor="#66d9cc"/></linearGradient></defs>
          </svg>
          <span className="font-headline text-sm font-bold tracking-tighter text-[#c3f5ff] uppercase">PostureGuard</span>
        </Link>
        <Link href="/" className="font-headline text-[10px] uppercase tracking-widest text-[#e5e2e1]/40 hover:text-[#c3f5ff] transition-colors">
          &larr; Back to Home
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-8">
        <div className="max-w-screen-lg w-full">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c3f5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="font-headline text-[11px] uppercase tracking-[0.3em] text-[#c3f5ff]/70 font-bold">Privacy Protocol</span>
            </div>
            <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter text-[#e5e2e1] uppercase">
              Ethical Considerations
            </h1>
          </div>

          {!started ? (
            <button
              onClick={() => setStarted(true)}
              className="bg-[#c3f5ff] text-[#00363d] px-10 py-4 rounded-full font-headline text-sm font-bold uppercase tracking-widest hover:shadow-[0_0_30px_rgba(195,245,255,0.3)] transition-all active:scale-95"
            >
              Initialize Protocol Review
            </button>
          ) : (
            <div className="relative bg-[#131313] border border-[#c3f5ff]/15 rounded-lg p-8 md:p-12 shadow-[0_0_60px_rgba(195,245,255,0.03)]">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#c3f5ff]/40 ml-2">postureguard — privacy protocol</span>
              </div>

              <p className="font-body text-lg md:text-xl text-[#bac9cc] leading-relaxed font-light">
                <TypewriterText speed={60} onComplete={() => setParagraphDone(true)} />
              </p>

              <div className="mt-8 text-right">
                <span className="font-headline text-xs uppercase tracking-[0.15em] text-[#c3f5ff]/50">
                  {paragraphDone && <TypewriterAttribution speed={60} />}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
