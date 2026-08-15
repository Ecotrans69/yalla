import { useRef, useState } from 'react'
import { checkSpoken } from '../../engine/scoring'
import { recognize, abortRecognition } from '../../speech/stt'
import { AudioButton } from '../components/AudioButton'
import { AR_ATTRS, targetAttrs, targetClass } from './types'
import type { ExerciseProps } from './types'

/** Écoute puis répète au micro — l'app corrige la prononciation */
export function SpeakRepeat({ ex, course, kid, onAnswer }: ExerciseProps) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'done'>('idle')
  const [msg, setMsg] = useState('')
  const [attempts, setAttempts] = useState(0)
  // verrou définitif : l'annulation du micro rejette la promesse APRÈS coup et
  // rouvrait un exercice déjà validé (qui pouvait ensuite coûter un cœur)
  const answered = useRef(false)
  const item = ex.item!

  const listen = async () => {
    if (status !== 'idle' || answered.current) return
    setStatus('listening')
    setMsg('')
    try {
      const heard = await recognize(course.sttLang)
      if (answered.current) return
      const res = checkSpoken(heard, item, course.id, kid)
      const pct = Math.round(res.score * 100)
      if (res.ok) {
        answered.current = true
        setStatus('done')
        onAnswer(true, `🎯 ${pct} % — super prononciation !`)
      } else if (attempts >= 2) {
        answered.current = true
        setStatus('done')
        onAnswer(false, `🎯 ${pct} % — on la retravaillera !`)
      } else {
        setAttempts((a) => a + 1)
        setStatus('idle')
        setMsg(`🎯 ${pct} % — pas mal, réessaie !`)
      }
    } catch (e) {
      if (answered.current) return
      setStatus('idle')
      setMsg((e as Error).message)
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontSize: 20 }}>{ex.question}</h2>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        {item.emoji && <div style={{ fontSize: 40 }}>{item.emoji}</div>}
        <div
          className={targetClass(course)}
          {...targetAttrs(course)}
          style={{ fontSize: course.id === 'ar' ? undefined : 24, fontWeight: 800 }}
        >
          {item.text}
        </div>
        {course.id === 'dz' && item.arScript && (
          <div className="arabic" {...AR_ATTRS} style={{ color: 'var(--text-dim)', fontSize: '1.2em' }}>
            {item.arScript}
          </div>
        )}
        {item.phon && <div style={{ color: 'var(--text-dim)' }}>[{item.phon}]</div>}
        <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>{item.fr}</div>
        <div style={{ marginTop: 12 }}>
          <AudioButton item={item} course={course} autoPlay />
        </div>
      </div>

      <button
        aria-label="Parler au micro"
        onClick={() => void listen()}
        disabled={status === 'done'}
        className={status === 'listening' ? 'pulse' : ''}
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          border: 'none',
          fontSize: 44,
          cursor: 'pointer',
          background: status === 'listening' ? 'var(--red)' : 'var(--green)',
          boxShadow: `0 5px 0 ${status === 'listening' ? 'var(--red-dark)' : 'var(--green-dark)'}`,
          opacity: status === 'done' ? 0.4 : 1,
        }}
      >
        🎤
      </button>
      <div role="status" aria-live="polite" style={{ marginTop: 10, fontWeight: 700, minHeight: 24 }}>
        {status === 'listening' ? '🎧 Je t’écoute, parle !' : msg}
      </div>

      {/* masqué pendant l'écoute : sinon on annule un micro déjà lancé et la
          promesse rejetée rouvrait l'exercice */}
      {status === 'idle' && (
        <button
          className="btn btn-ghost"
          style={{ marginTop: 16 }}
          onClick={() => {
            if (answered.current) return
            answered.current = true
            abortRecognition()
            setStatus('done')
            onAnswer(true, 'Exercice passé — tu réessaieras au calme 😉')
          }}
        >
          Je ne peux pas parler là
        </button>
      )}
    </div>
  )
}
