import { AudioButton } from '../components/AudioButton'
import { targetClass } from './types'
import type { ExerciseProps } from './types'

/** Présentation d'un nouveau mot avec audio */
export function NewWord({ ex, course, onAnswer }: ExerciseProps) {
  const item = ex.item!
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="pill" style={{ background: 'var(--green-soft)', color: 'var(--green-ink)' }}>
        ✨ Nouveau mot
      </div>
      <div className="card pop" style={{ margin: '24px 0', padding: 28 }}>
        {item.emoji && <div style={{ fontSize: 64 }}>{item.emoji}</div>}
        <div className={targetClass(course)} style={{ fontSize: course.id === 'ar' ? undefined : 30, fontWeight: 800, margin: '8px 0' }}>
          {item.text}
        </div>
        {course.id === 'dz' && item.arScript && (
          <div className="arabic" style={{ color: 'var(--text-dim)' }}>{item.arScript}</div>
        )}
        {item.phon && <div style={{ color: 'var(--text-dim)' }}>[{item.phon}]</div>}
        <div style={{ fontSize: 20, marginTop: 8 }}>{item.fr}</div>
        <div style={{ marginTop: 16 }}>
          <AudioButton item={item} course={course} autoPlay />
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onAnswer(true)}>
        Continuer
      </button>
    </div>
  )
}
