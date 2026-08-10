import { useEffect, useRef } from 'react'
import type { Course, VocabItem } from '../../content/types'
import { speakItem, ttsAvailable } from '../../speech/tts'

interface Props {
  item: VocabItem
  course: Course
  /** Joue automatiquement à l'affichage */
  autoPlay?: boolean
  size?: number
}

/** Bouton 🔊 + tortue 🐢 (lecture lente) */
export function AudioButton({ item, course, autoPlay = false, size = 28 }: Props) {
  const played = useRef(false)

  useEffect(() => {
    if (autoPlay && !played.current && ttsAvailable()) {
      played.current = true
      void speakItem(item, course)
    }
  }, [autoPlay, item, course])

  if (!ttsAvailable()) return null

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button
        aria-label="Écouter"
        onClick={() => void speakItem(item, course)}
        style={{
          background: 'var(--blue)',
          border: 'none',
          borderRadius: 12,
          boxShadow: '0 3px 0 var(--blue-dark)',
          fontSize: size,
          padding: '6px 14px',
          cursor: 'pointer',
        }}
      >
        🔊
      </button>
      <button
        aria-label="Écouter lentement"
        onClick={() => void speakItem(item, course, true)}
        style={{
          background: 'transparent',
          border: '2px solid var(--border)',
          borderRadius: 12,
          fontSize: Math.round(size * 0.7),
          padding: '4px 10px',
          cursor: 'pointer',
        }}
      >
        🐢
      </button>
    </span>
  )
}
