import { useState } from 'react'
import { checkTyped } from '../../engine/scoring'
import { AudioButton } from '../components/AudioButton'
import type { ExerciseProps } from './types'

/** Écoute puis écris ce que tu entends */
export function ListenType({ ex, course, onAnswer }: ExerciseProps) {
  const [value, setValue] = useState('')
  const [done, setDone] = useState(false)
  const item = ex.item!

  const verify = () => {
    if (done || !value.trim()) return
    setDone(true)
    onAnswer(checkTyped(value, item.text, course.id).ok)
  }

  return (
    <div>
      <h2 style={{ fontSize: 20 }}>{ex.question}</h2>
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <AudioButton item={item} course={course} autoPlay size={36} />
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && verify()}
        disabled={done}
        placeholder="Écris ici…"
        aria-label="Réponse"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          width: '100%',
          padding: 14,
          fontSize: 18,
          borderRadius: 12,
          border: '2px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--text)',
        }}
      />
      {!done && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 20 }}
          disabled={!value.trim()}
          onClick={verify}
        >
          Vérifier
        </button>
      )}
    </div>
  )
}
