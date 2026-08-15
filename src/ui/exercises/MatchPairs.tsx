import { useMemo, useState } from 'react'
import { shuffle } from '../../engine/lessonBuilder'
import { targetAttrs, targetClass } from './types'
import type { ExerciseProps } from './types'

interface Entry {
  i: number
  label: string
}

/**
 * Associe les paires français ↔ langue cible.
 * L'appariement se fait par INDEX, jamais par texte : sinon un mot identique
 * dans les deux langues (bus, pizza, taxi…) rendait l'exercice insoluble.
 */
export function MatchPairs({ ex, course, onAnswer }: ExerciseProps) {
  const pairs = ex.pairs ?? []
  const left = useMemo(
    () => shuffle(pairs.map((p, i) => ({ i, label: p.a })), Math.random),
    [pairs]
  )
  const right = useMemo(
    () => shuffle(pairs.map((p, i) => ({ i, label: p.b })), Math.random),
    [pairs]
  )
  const [selLeft, setSelLeft] = useState<number | null>(null)
  const [selRight, setSelRight] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [shake, setShake] = useState(false)

  const tryMatch = (l: number | null, r: number | null) => {
    if (l === null || r === null) return
    if (l === r) {
      const next = new Set(matched).add(l)
      setMatched(next)
      if (next.size === pairs.length) onAnswer(true)
    } else {
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
    setSelLeft(null)
    setSelRight(null)
  }

  const btn = (entry: Entry, side: 'l' | 'r') => {
    const isMatched = matched.has(entry.i)
    const isSel = side === 'l' ? selLeft === entry.i : selRight === entry.i
    return (
      <button
        key={side + entry.i}
        className={`btn-choice ${isSel ? 'selected' : ''} ${isMatched ? 'correct' : ''} ${side === 'r' ? targetClass(course) : ''}`}
        {...(side === 'r' ? targetAttrs(course) : {})}
        disabled={isMatched}
        style={{ width: '100%', opacity: isMatched ? 0.5 : 1 }}
        onClick={() => {
          if (side === 'l') {
            setSelLeft(entry.i)
            tryMatch(entry.i, selRight)
          } else {
            setSelRight(entry.i)
            tryMatch(selLeft, entry.i)
          }
        }}
      >
        {entry.label}
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
