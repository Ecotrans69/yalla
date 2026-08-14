import { useEffect, useMemo, useRef, useState } from 'react'
import { getCourse, findLesson, allLessons } from '../../content'
import { buildLesson, reviewableIds, type Exercise } from '../../engine/lessonBuilder'
import { dueItems } from '../../engine/srs'
import { BADGES, currentHearts, displayStreak } from '../../engine/gamification'
import { sttAvailable } from '../../speech/stt'
import { ttsAvailable } from '../../speech/tts'
import { stopAudio } from '../../speech/audio'
import { useApp } from '../../store/state'
import { useRouter } from '../Router'
import { CheckFooter, type Feedback } from '../components/CheckFooter'
import { FillBlank } from '../exercises/FillBlank'
import { LetterForms } from '../exercises/LetterForms'
import { LetterIntro } from '../exercises/LetterIntro'
import { ListenChoose } from '../exercises/ListenChoose'
import { ListenType } from '../exercises/ListenType'
import { MatchPairs } from '../exercises/MatchPairs'
import { NewWord } from '../exercises/NewWord'
import { SelectImage } from '../exercises/SelectImage'
import { SpeakRepeat } from '../exercises/SpeakRepeat'
import { TranslateTiles } from '../exercises/TranslateTiles'

interface Props {
  courseId: string
  lessonId?: string
  review?: boolean
  /** Injectable pour les tests */
  rng?: () => number
}

/** Types sans bandeau de feedback (on avance directement) */
const DIRECT_TYPES = new Set(['new_word', 'letter_intro'])

function correctionOf(ex: Exercise): string | undefined {
  if (ex.choices && ex.correctId) {
    const c = ex.choices.find((ch) => ch.id === ex.correctId)
    if (c) return c.sub ? `${c.label} (${c.sub})` : c.label
  }
  if (ex.item) return ex.item.phon ? `${ex.item.text} [${ex.item.phon}]` : ex.item.text
  return undefined
}

const CONFETTI_COLORS = ['#58cc02', '#ffc800', '#1cb0f6', '#ce82ff', '#ff4b4b']

export function LessonScreen({ courseId, lessonId, review = false, rng = Math.random }: Props) {
  const { profile, data, completeLesson, spendHeart } = useApp()
  const { navigate } = useRouter()
  const course = getCourse(courseId)

  const kid = profile?.kid ?? false
  const initialHearts = useRef(
    data && !kid ? currentHearts(data.hearts, Date.now()).count : Infinity
  )

  // On FILTRE avant de tronquer : les lettres, souvent les plus faibles, sont
  // en tête de dueItems et évinceraient tout le vocabulaire d'une session.
  const reviewIds = useMemo(
    () =>
      review && data && course
        ? reviewableIds(course, dueItems(data.srs[course.id] ?? [], Date.now())).slice(0, 10)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [review]
  )

  const [queue, setQueue] = useState<Exercise[]>(() => {
    if (!course) return []
    const carrier = review
      ? (allLessons(course).find((l) => l.kind === 'vocab') ?? allLessons(course)[0])
      : findLesson(course, lessonId ?? '')?.lesson
    if (!carrier) return []
    if (review && reviewIds.length === 0) return []
    return buildLesson(course, carrier, {
      kid,
      sttAvailable: sttAvailable(),
      ttsAvailable: ttsAvailable(),
      rng,
      reviewIds: review ? reviewIds : undefined,
    })
  })
  const initialLen = useRef(queue.length)

  const [idx, setIdx] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [heartsLost, setHeartsLost] = useState(0)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [outOfHearts, setOutOfHearts] = useState(false)
  const firstResults = useRef(new Map<string, boolean>())
  const [done, setDone] = useState<{ xp: number; newBadges: string[]; accuracy: number } | null>(
    null
  )
  const completedRef = useRef(false)
  const [footerH, setFooterH] = useState(0)

  // on coupe la voix quand on quitte la leçon (retour arrière, navigation…)
  useEffect(() => stopAudio, [])

  // remonter en haut à chaque nouvel exercice, et amener la correction à l'écran
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [idx])

  useEffect(() => {
    if (!feedback) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth'
    const marks = document.querySelectorAll('.btn-choice.correct')
    const target = marks[marks.length - 1]
    if (target && !feedback.correct) target.scrollIntoView({ block: 'center', behavior })
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
  }, [feedback])

  if (!course || !profile || !data) return null

  const backPath = `/cours/${course.id}`

  if (review && reviewIds.length === 0) {
    return (
      <div className="screen" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: 64 }}>🎉</div>
        <h2>Rien à réviser, bravo !</h2>
        <button className="btn btn-primary" onClick={() => navigate(backPath)}>
          Retour
        </button>
      </div>
    )
  }

  if (queue.length === 0) {
    return (
      <div className="screen" style={{ textAlign: 'center', paddingTop: 60 }}>
        <h2>Leçon introuvable</h2>
        <button className="btn btn-primary" onClick={() => navigate(backPath)}>
          Retour
        </button>
      </div>
    )
  }

  const finish = () => {
    if (completedRef.current) return
    completedRef.current = true
    const results = Array.from(firstResults.current, ([itemId, correct]) => ({ itemId, correct }))
    const { xp, newBadges } = completeLesson(
      course.id,
      lessonId ?? `revision:${course.id}`,
      initialLen.current,
      mistakes,
      results
    )
    const accuracy = Math.round((initialLen.current / (initialLen.current + mistakes)) * 100)
    setDone({ xp, newBadges, accuracy })
  }

  const advance = (nextQueue: Exercise[]) => {
    stopAudio()
    setFeedback(null)
    if (!review && !kid && initialHearts.current - heartsLost <= 0) {
      setOutOfHearts(true)
      return
    }
    if (idx + 1 >= nextQueue.length) finish()
    else setIdx(idx + 1)
  }

  const onAnswer = (correct: boolean, note?: string) => {
    const ex = queue[idx]
    const itemId = ex.item?.id
    if (itemId && !DIRECT_TYPES.has(ex.type) && !firstResults.current.has(itemId)) {
      firstResults.current.set(itemId, correct)
    }
    if (correct) {
      if (DIRECT_TYPES.has(ex.type)) advance(queue)
      else setFeedback({ correct: true, note, item: ex.item, course })
    } else {
      setMistakes((m) => m + 1)
      let newQueue = queue
      if (queue.filter((q) => q === ex).length < 2) {
        newQueue = [...queue, ex] // on la reverra en fin de leçon
        setQueue(newQueue)
      }
      if (!review && !kid) {
        spendHeart()
        setHeartsLost((h) => h + 1)
      }
      setFeedback({ correct: false, correction: correctionOf(ex), note, item: ex.item, course })
    }
  }

  // ===== écran de fin =====
  if (done) {
    const streak = displayStreak(data.streak, Date.now())
    return (
      <div className="screen" style={{ textAlign: 'center', paddingTop: 40 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${(i * 41) % 100}%`,
              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${(i % 8) * 0.15}s`,
            }}
          />
        ))}
        <div style={{ fontSize: 72 }}>🎉</div>
        <h1>Leçon terminée !</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '20px 0' }}>
          <div className="card" style={{ minWidth: 90 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 700 }}>XP</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--gold-dark)' }}>
              +{done.xp}
            </div>
          </div>
          <div className="card" style={{ minWidth: 90 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 700 }}>Précision</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)' }}>
              {done.accuracy}%
            </div>
          </div>
          <div className="card" style={{ minWidth: 90 }}>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', fontWeight: 700 }}>Série</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#ff9600' }}>🔥 {streak}</div>
          </div>
        </div>
        {done.newBadges.length > 0 && (
          <div className="card pop" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Nouveau badge !</div>
            {done.newBadges.map((id) => {
              const b = BADGES.find((x) => x.id === id)
              return b ? (
                <div key={id} style={{ fontSize: 18 }}>
                  {b.emoji} <strong>{b.title}</strong> — {b.desc}
                </div>
              ) : null
            })}
          </div>
        )}
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(backPath)}>
          Continuer
        </button>
      </div>
    )
  }

  // ===== plus de cœurs =====
  if (outOfHearts) {
    return (
      <div className="screen" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: 64 }}>💔</div>
        <h2>Plus de cœurs !</h2>
        <p style={{ color: 'var(--text-dim)' }}>
          La leçon s'arrête là. Les cœurs reviennent avec le temps, et les révisions sont
          gratuites.
        </p>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate(backPath)}>
          Retour au parcours
        </button>
      </div>
    )
  }

  // ===== exercice courant =====
  const ex = queue[idx]
  const common = { ex, course, kid, onAnswer }
  const progress = Math.round((idx / queue.length) * 100)

  return (
    <div
      className="screen"
      style={{ paddingBottom: feedback ? footerH + 24 : 140, transition: 'padding-bottom .15s' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          aria-label="Quitter la leçon"
          onClick={() => {
            if (window.confirm('Quitter la leçon ? Ta progression sera perdue.')) {
              stopAudio()
              navigate(backPath)
            }
          }}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-dim)' }}
        >
          ✕
        </button>
        <div
          role="progressbar"
          aria-valuenow={progress}
          style={{ flex: 1, background: 'var(--border)', borderRadius: 99, height: 14, overflow: 'hidden' }}
        >
          <div style={{ width: `${progress}%`, background: 'var(--green)', height: '100%', transition: 'width .3s' }} />
        </div>
        {!kid && !review && (
          <span style={{ fontWeight: 800, color: 'var(--red)' }}>
            ❤️ {Math.max(0, initialHearts.current - heartsLost)}
          </span>
        )}
      </div>

      <div key={idx}>
        {ex.type === 'new_word' && <NewWord {...common} />}
        {ex.type === 'letter_intro' && <LetterIntro {...common} />}
        {ex.type === 'select_image' && <SelectImage {...common} />}
        {ex.type === 'listen_choose' && <ListenChoose {...common} />}
        {ex.type === 'listen_type' && <ListenType {...common} />}
        {ex.type === 'speak_repeat' && <SpeakRepeat {...common} />}
        {ex.type === 'translate_tiles' && <TranslateTiles {...common} />}
        {ex.type === 'match_pairs' && <MatchPairs {...common} />}
        {ex.type === 'fill_blank' && <FillBlank {...common} />}
        {ex.type === 'letter_forms' && <LetterForms {...common} />}
      </div>

      {feedback && (
        <CheckFooter
          feedback={feedback}
          onContinue={() => advance(queue)}
          onHeight={setFooterH}
        />
      )}
    </div>
  )
}
