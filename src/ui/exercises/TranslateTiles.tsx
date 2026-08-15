import { useState } from 'react'
import { normalize } from '../../engine/normalize'
import { targetAttrs, targetClass } from './types'
import type { ExerciseProps } from './types'

/** Assemble la traduction avec des tuiles de mots */
export function TranslateTiles({ ex, course, onAnswer }: ExerciseProps) {
  const tiles = ex.tiles ?? []
  const [chosen, setChosen] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const item = ex.item!

  const verify = () => {
    if (done || chosen.length === 0) return
    setDone(true)
    const assembled = chosen.map((i) => tiles[i]).join(' ')
    onAnswer(normalize(assembled, course.id) === normalize(item.text, course.id))
  }

  const tileStyle = {
    border: '2px solid var(--border)',
    borderBottomWidth: 4,
    borderRadius: 12,
    background: 'var(--card)',
    color: 'var(--text)',
    padding: '10px 14px',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
  } as const

  const cls = targetClass(course)
  const attrs = targetAttrs(course)

  return (
    <div>
      <h2 style={{ fontSize: 20 }}>{ex.question}</h2>
      <div
        aria-label="Ta réponse"
        style={{
          minHeight: 56,
          borderBottom: '2px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: '8px 0',
          marginBottom: 20,
        }}
      >
        {chosen.map((tileIdx, pos) => (
          <button
            key={`${tileIdx}-${pos}`}
            className={cls}
            {...attrs}
            style={tileStyle}
            onClick={() => !done && setChosen(chosen.filter((_, i) => i !== pos))}
          >
            {tiles[tileIdx]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tiles.map((t, i) => {
          const used = chosen.includes(i)
          return (
            <button
              key={i}
              className={cls}
              {...attrs}
              disabled={used || done}
              style={{ ...tileStyle, opacity: used ? 0.25 : 1 }}
              onClick={() => setChosen([...chosen, i])}
            >
              {t}
            </button>
          )
        })}
      </div>
      {!done && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 24 }}
          disabled={chosen.length === 0}
          onClick={verify}
        >
          Vérifier
        </button>
      )}
    </div>
  )
}
