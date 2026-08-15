import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ExerciseProps } from './types'

interface QcmProps extends ExerciseProps {
  /** Attributs de langue du libellé (lang/dir) */
  labelAttrs?: { lang?: string; dir?: 'rtl' }
  /** Contenu affiché au-dessus des choix (bouton audio…) */
  header?: ReactNode
  /** Classe appliquée au label des choix (ex 'arabic') */
  labelClass?: string
}

/** Base QCM : question, grille de choix, bouton VÉRIFIER, révélation */
export function Qcm({ ex, header, labelClass = '', labelAttrs = {}, onAnswer }: QcmProps) {
  const [sel, setSel] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

  const verify = () => {
    if (sel === null || revealed) return
    setRevealed(true)
    onAnswer(sel === ex.correctId)
  }

  const stateClass = (id: string) => {
    if (!revealed) return sel === id ? 'selected' : ''
    if (id === ex.correctId) return 'correct'
    if (id === sel) return 'wrong'
    return ''
  }

  // Tout-ou-rien : si un seul choix n'a pas d'image, on n'en montre aucune —
  // sinon l'intrus visuel donne la bonne réponse sans connaître le mot.
  const hasEmoji = !!ex.choices?.length && ex.choices.every((c) => c.emoji)

  return (
    <div>
      {ex.question && (
        <h2 style={{ fontSize: 20, whiteSpace: 'pre-line' }}>{ex.question}</h2>
      )}
      {header}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: hasEmoji ? 'repeat(2, 1fr)' : '1fr',
          gap: 10,
          marginTop: 16,
        }}
      >
        {ex.choices?.map((c) => (
          <button
            key={c.id}
            className={`btn-choice ${stateClass(c.id)}`}
            onClick={() => !revealed && setSel(c.id)}
            style={{ minHeight: hasEmoji ? 96 : 56 }}
          >
            {hasEmoji && c.emoji && <div style={{ fontSize: 34 }}>{c.emoji}</div>}
            <div className={labelClass} {...labelAttrs}>
              {c.label}
            </div>
            {c.sub && <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{c.sub}</div>}
          </button>
        ))}
      </div>
      {!revealed && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 20 }}
          disabled={sel === null}
          onClick={verify}
        >
          Vérifier
        </button>
      )}
    </div>
  )
}
