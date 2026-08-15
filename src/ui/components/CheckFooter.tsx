import { useEffect, useRef } from 'react'
import type { Course, VocabItem } from '../../content/types'
import { AudioButton } from './AudioButton'
import { Mascotte } from './Mascotte'

export interface Feedback {
  correct: boolean
  /** Bonne réponse à afficher en cas d'erreur */
  correction?: string
  /** Message complémentaire (ex : score de prononciation) */
  note?: string
  /** Item à réécouter (bouton audio dans le bandeau) */
  item?: VocabItem
  course?: Course
}

interface Props {
  feedback: Feedback
  onContinue(): void
  /** Remonte la hauteur réelle du bandeau pour que l'exercice reste atteignable */
  onHeight?(h: number): void
}

/** Bandeau de résultat + bouton CONTINUER, fixé en bas pendant une leçon */
export function CheckFooter({ feedback, onContinue, onHeight }: Props) {
  const ok = feedback.correct
  const canReplay = !!feedback.item && !!feedback.course
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el || !onHeight) return
    onHeight(el.offsetHeight)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => onHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [onHeight])

  return (
    <div
      ref={boxRef}
      className="pop"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: ok ? 'var(--green-soft)' : 'var(--red-soft)',
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        zIndex: 20,
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Mascotte humeur={ok ? 'content' : 'triste'} taille={46} />
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: ok ? 'var(--green-ink)' : 'var(--red-ink)',
            }}
          >
            {ok ? 'Bien joué !' : 'Pas tout à fait…'}
          </div>
        </div>
        {!ok && feedback.correction && (
          <div style={{ color: 'var(--red-ink)', marginBottom: 8 }}>
            La bonne réponse : <strong>{feedback.correction}</strong>
          </div>
        )}
        {feedback.note && (
          <div style={{ color: ok ? 'var(--green-ink)' : 'var(--red-ink)', marginBottom: 8 }}>
            {feedback.note}
          </div>
        )}
        {canReplay && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 700, color: ok ? 'var(--green-ink)' : 'var(--red-ink)' }}>
              {ok ? 'Réécouter :' : 'Écoute la bonne réponse :'}
            </span>
            <AudioButton item={feedback.item!} course={feedback.course!} size={24} />
          </div>
        )}
        {/* pas d'autoFocus : il coupe l'annonce du résultat par le lecteur d'écran */}
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onContinue}>
          Continuer
        </button>
      </div>
    </div>
  )
}
