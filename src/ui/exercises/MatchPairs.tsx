import { useMemo, useState } from 'react'
import { targetClass } from './types'
import type { ExerciseProps } from './types'

/** Associe les paires français ↔ langue cible (les erreurs ne coûtent pas de cœur) */
export function MatchPairs({ ex, course, onAnswer }: ExerciseProps) {
  const pairs = ex.pairs ?? []
  const left = useMemo(() => pairs.map((p) => p.a).sort(() => Math.random() - 0.5), [pairs])
  const right = useMemo(() => pairs.map((p) => p.b).sort(() => Math.random() - 0.5), [pairs])
  const [selLeft, setSelLeft] = useState<string | null>(null)
  const [selRight, setSelRight] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [shake, setShake] = useState(false)

  const tryMatch = (l: string | null, r: string | null) => {
    if (l === null || r === null) return
    const isPair = pairs.some((p) => p.a === l && p.b === r)
    if (isPair) {
      const next = new Set(matched)
      next.add(l)
      next.add(r)
      setMatched(next)
      if (next.size === pairs.length * 2) onAnswer(true)
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    setSelLeft(null)
    setSelRight(null)
  }

  const btn = (label: string, side: 'l' | 'r') => {
    const isMatched = matched.has(label)
    const isSel = side === 'l' ? selLeft === label : selRight === label
    return (
      <button
        key={side + label}
        className={`btn-choice ${isSel ? 'selected' : ''} ${isMatched ? 'correct' : ''} ${side === 'r' ? targetClass(course) : ''}`}
        disabled={isMatched}
        style={{ width: '100%', opacity: isMatched ? 0.5 : 1 }}
        onClick={() => {
          if (side === 'l') {
            setSelLeft(label)
            tryMatch(label, selRight)
          } else {
            setSelRight(label)
            tryMatch(selLeft, label)
          }
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={shake ? { animation: 'pulse .2s 2' } : undefined}>
      <h2 style={{ fontSize: 20 }}>{ex.question}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {left.map((l) => btn(l, 'l'))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {right.map((r) => btn(r, 'r'))}
        </div>
      </div>
    </div>
  )
}
