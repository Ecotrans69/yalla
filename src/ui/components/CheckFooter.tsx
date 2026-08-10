export interface Feedback {
  correct: boolean
  /** Bonne réponse à afficher en cas d'erreur */
  correction?: string
  /** Message complémentaire (ex : score de prononciation) */
  note?: string
}

interface Props {
  feedback: Feedback
  onContinue(): void
}

/** Bandeau de résultat + bouton CONTINUER, fixé en bas pendant une leçon */
export function CheckFooter({ feedback, onContinue }: Props) {
  const ok = feedback.correct
  return (
    <div
      className="pop"
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
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: ok ? 'var(--green-dark)' : 'var(--red-dark)',
            marginBottom: 4,
          }}
        >
          {ok ? '✅ Bien joué !' : '❌ Pas tout à fait…'}
        </div>
        {!ok && feedback.correction && (
          <div style={{ color: 'var(--red-dark)', marginBottom: 8 }}>
            La bonne réponse : <strong>{feedback.correction}</strong>
          </div>
        )}
        {feedback.note && (
          <div style={{ color: ok ? 'var(--green-dark)' : 'var(--red-dark)', marginBottom: 8 }}>
            {feedback.note}
          </div>
        )}
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={onContinue}
          autoFocus
        >
          Continuer
        </button>
      </div>
    </div>
  )
}
