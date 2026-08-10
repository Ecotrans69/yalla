import { AudioButton } from '../components/AudioButton'
import type { ExerciseProps } from './types'

const FORM_LABELS: [keyof import('../../content/types').Letter['forms'], string][] = [
  ['isolated', 'seule'],
  ['initial', 'début'],
  ['medial', 'milieu'],
  ['final', 'fin'],
]

/** Découverte d'une lettre arabe : caractère géant + 4 formes + son */
export function LetterIntro({ ex, course, onAnswer }: ExerciseProps) {
  const letter = ex.letter!
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="pill" style={{ background: 'var(--green-soft)', color: 'var(--green-dark)' }}>
        ✨ Nouvelle lettre
      </div>
      <div className="card pop" style={{ margin: '20px 0', padding: 24 }}>
        <div className="arabic" style={{ fontSize: 96, lineHeight: 1.2 }}>{letter.char}</div>
        <div style={{ fontWeight: 800, fontSize: 22 }}>{letter.name}</div>
        <div style={{ color: 'var(--text-dim)' }}>se prononce « {letter.phon} »</div>
        {ex.item && (
          <div style={{ margin: '12px 0' }}>
            <AudioButton item={ex.item} course={course} autoPlay />
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
          {FORM_LABELS.map(([key, label]) => (
            <div key={key} className="card" style={{ padding: 8 }}>
              <div className="arabic" style={{ fontSize: 34 }}>{letter.forms[key]}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onAnswer(true)}>
        Continuer
      </button>
    </div>
  )
}
