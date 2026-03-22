'use client'

import { useState, useEffect } from 'react'

export default function SessionScoreChart({ accessToken }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSessions() {
      try {
        const headers = {}
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
        const res = await fetch('/api/sessions', { headers })
        if (res.ok) {
          const data = await res.json()
          setSessions((data.sessions || []).slice(0, 10).reverse())
        }
      } catch (e) {
        console.error('Failed to fetch sessions for chart:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [accessToken])

  if (loading) return null
  if (sessions.length < 2) return null

  const maxScore = 100
  const chartHeight = 160
  const chartWidth = 100

  return (
    <div className="glass-card rounded-2xl p-6 mb-8">
      <h3 className="text-sm font-semibold text-vs-on-surface mb-4 tracking-wide uppercase">
        Posture Score Trend
      </h3>
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${sessions.length * 60 + 20} ${chartHeight + 40}`}
          className="w-full min-w-[300px]"
          style={{ maxHeight: '220px' }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((v) => {
            const y = chartHeight - (v / maxScore) * chartHeight + 10
            return (
              <g key={v}>
                <line
                  x1="30" y1={y}
                  x2={sessions.length * 60 + 10} y2={y}
                  stroke="rgba(76,215,246,0.1)" strokeWidth="0.5"
                />
                <text x="0" y={y + 3} fill="rgba(76,215,246,0.4)" fontSize="8" fontFamily="monospace">
                  {v}
                </text>
              </g>
            )
          })}

          {/* Line path */}
          <polyline
            fill="none"
            stroke="#4CD7F6"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={sessions.map((s, i) => {
              const x = i * 60 + 40
              const y = chartHeight - ((s.posture_score || 0) / maxScore) * chartHeight + 10
              return `${x},${y}`
            }).join(' ')}
          />

          {/* Area fill */}
          <polygon
            fill="url(#chartGrad)"
            opacity="0.15"
            points={[
              `${40},${chartHeight + 10}`,
              ...sessions.map((s, i) => {
                const x = i * 60 + 40
                const y = chartHeight - ((s.posture_score || 0) / maxScore) * chartHeight + 10
                return `${x},${y}`
              }),
              `${(sessions.length - 1) * 60 + 40},${chartHeight + 10}`,
            ].join(' ')}
          />

          {/* Dots */}
          {sessions.map((s, i) => {
            const x = i * 60 + 40
            const score = s.posture_score || 0
            const y = chartHeight - (score / maxScore) * chartHeight + 10
            const color = score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill={color} stroke="#1a1a1a" strokeWidth="1.5" />
                <text
                  x={x} y={y - 10}
                  fill={color} fontSize="9" fontFamily="monospace"
                  textAnchor="middle" fontWeight="bold"
                >
                  {score}
                </text>
                <text
                  x={x} y={chartHeight + 28}
                  fill="rgba(255,255,255,0.3)" fontSize="7" fontFamily="monospace"
                  textAnchor="middle"
                >
                  {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </text>
              </g>
            )
          })}

          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4CD7F6" />
              <stop offset="100%" stopColor="#4CD7F6" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}
