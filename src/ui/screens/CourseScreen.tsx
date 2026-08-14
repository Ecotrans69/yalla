import { useState } from 'react'
import { getCourse, allLessons } from '../../content'
import { dueItems } from '../../engine/srs'
import { crownLevel, currentHearts, nextHeartIn } from '../../engine/gamification'
import { useApp } from '../../store/state'
import { useRouter } from '../Router'

const UNIT_COLORS = ['var(--green)', 'var(--blue)', 'var(--purple)', '#ff9600', '#ff4b96', '#00cd9c']

export function CourseScreen({ courseId }: { courseId: string }) {
  const { profile, data } = useApp()
  const { navigate } = useRouter()
  const [noHearts, setNoHearts] = useState(false)
  const course = getCourse(courseId)
  if (!course || !profile || !data) return null

  const now = Date.now()
  const lessons = allLessons(course)
  const due = dueItems(data.srs[course.id] ?? [], now).length
  const hearts = currentHearts(data.hearts, now)

  const openLesson = (lessonId: string) => {
    if (!profile.kid && hearts.count === 0) {
      setNoHearts(true)
      return
    }
    navigate(`/lecon/${course.id}/${lessonId}`)
  }

  // Une leçon est ouverte si c'est la 1re, si la précédente a été faite,
  // ou si elle-même a déjà été terminée — sinon un réordonnancement du cours
  // re-verrouillerait des leçons déjà acquises.
  const unlocked = (globalIdx: number) =>
    globalIdx === 0 ||
    (data.lessonsCompleted[lessons[globalIdx].id] ?? 0) > 0 ||
    (data.lessonsCompleted[lessons[globalIdx - 1].id] ?? 0) > 0

  let globalIdx = -1

  return (
    <div className="screen">
      <button
        onClick={() => navigate('/')}
        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, padding: 0 }}
      >
        ‹ Retour
      </button>
      <h1 style={{ fontSize: 24 }}>
        {course.flag} {course.title}
      </h1>

      {due > 0 && (
        <button
          className="btn btn-blue"
          style={{ width: '100%', marginBottom: 16 }}
          onClick={() => navigate(`/revision/${course.id}`)}
        >
          📝 Réviser {due} mot{due > 1 ? 's' : ''} (gratuit)
        </button>
      )}

      {course.units.map((unit, uIdx) => {
        const color = UNIT_COLORS[uIdx % UNIT_COLORS.length]
        const unitCrowns = crownLevel(
          Math.min(...unit.lessons.map((l) => data.lessonsCompleted[l.id] ?? 0))
        )
        return (
          <div key={unit.id} style={{ marginBottom: 24 }}>
            <div
              style={{
                background: color,
                color: '#fff',
                borderRadius: 16,
                padding: '12px 16px',
                fontWeight: 800,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {unit.icon} {unit.title}
              </span>
              {unitCrowns > 0 && <span>👑 {unitCrowns}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12, gap: 10 }}>
              {unit.lessons.map((lesson, lIdx) => {
                globalIdx++
                const isUnlocked = unlocked(globalIdx)
                const times = data.lessonsCompleted[lesson.id] ?? 0
                const offset = [0, -50, 0, 50][lIdx % 4]
                return (
                  <button
                    key={lesson.id}
                    disabled={!isUnlocked}
                    onClick={() => openLesson(lesson.id)}
                    aria-label={`Leçon ${lesson.title}`}
                    style={{
                      transform: `translateX(${offset}px)`,
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      border: 'none',
                      cursor: isUnlocked ? 'pointer' : 'default',
                      fontSize: 26,
                      fontWeight: 800,
                      color: '#fff',
                      background: !isUnlocked ? 'var(--locked)' : times > 0 ? 'var(--gold)' : color,
                      boxShadow: !isUnlocked
                        ? 'none'
                        : `0 5px 0 ${times > 0 ? 'var(--gold-dark)' : 'rgba(0,0,0,.25)'}`,
                    }}
                    title={lesson.title}
                  >
                    {!isUnlocked ? '🔒' : times > 0 ? '⭐' : lIdx + 1}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {noHearts && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            padding: 16,
          }}
          onClick={() => setNoHearts(false)}
        >
          <div className="card pop" style={{ maxWidth: 360, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 48 }}>💔</div>
            <h2>Plus de cœurs !</h2>
            <p style={{ color: 'var(--text-dim)' }}>
              Prochain cœur dans {Math.ceil(nextHeartIn(data.hearts, now) / 60000)} min. En
              attendant, les révisions sont gratuites !
            </p>
            {due > 0 && (
              <button
                className="btn btn-blue"
                style={{ width: '100%', marginBottom: 8 }}
                onClick={() => navigate(`/revision/${course.id}`)}
              >
                📝 Réviser
              </button>
            )}
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setNoHearts(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
