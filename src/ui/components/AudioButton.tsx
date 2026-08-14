import { useEffect, useRef } from 'react'
import type { Course, VocabItem } from '../../content/types'
import { playItem } from '../../speech/audio'
import { useApp } from '../../store/state'

interface Props {
  item: VocabItem
  course: Course
  /** Joue automatiquement à l'affichage */
  autoPlay?: boolean
  size?: number
}

/** Bouton 🔊 + tortue 🐢 (lecture lente) — voix neurales avec fallback voix du téléphone */
export function AudioButton({ item, course, autoPlay = false, size = 28 }: Props) {
  const { data } = useApp()
  const voice = data?.voice ?? 'mix'
  const rate = data?.rate ?? 1
  const played = useRef(false)

  useEffect(() => {
    if (!autoPlay || played.current) return
    played.current = true
    void playItem(item, course, false, voice, rate)
    // StrictMode (dev) démonte/remonte : on se ré-arme pour ne pas rester muet
    return () => {
      played.current = false
    }
  }, [autoPlay, item, course, voice, rate])

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button
        aria-label="Écouter"
        onClick={() => void playItem(item, course, false, voice, rate)}
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
        onClick={() => void playItem(item, course, true, voice, rate)}
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
