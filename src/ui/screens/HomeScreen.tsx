import { getCourses, allLessons } from '../../content'
import { dueItems } from '../../engine/srs'
import { parisDay } from '../../engine/gamification'
import { useApp } from '../../store/state'
import { useRouter } from '../Router'
import { InstallHint } from '../components/InstallHint'

export function HomeScreen() {
  const { profile, data } = useApp()
  const { navigate } = useRouter()
  if (!profile || !data) return null

  const now = Date.now()
  const xpToday = data.xpByDay[parisDay(now)] ?? 0
  const goalPct = Math.min(100, Math.round((xpToday / data.dailyGoal) * 100))

  return (
    <div className="screen">
      <h1 style={{ fontSize: 24 }}>
        Salut {profile.name} {profile.avatar}
      </h1>
      <InstallHint />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>Objectif du jour</span>
          <span>
            {xpToday} / {data.dailyGoal} XP
          </span>
        </div>
        <div
          style={{
            background: 'var(--border)',
            borderRadius: 99,
            height: 14,
            marginTop: 8,
            overflow: 'hidden',
          }}
          role="progressbar"
          aria-valuenow={goalPct}
        >
          <div
            style={{
              width: `${goalPct}%`,
              background: goalPct >= 100 ? 'var(--gold)' : 'var(--green)',
              height: '100%',
              transition: 'width .3s',
            }}
          />
        </div>
        {goalPct >= 100 && (
          <div style={{ marginTop: 6, color: 'var(--gold-dark)', fontWeight: 800 }}>
            🎉 Objectif atteint !
          </div>
        )}
      </div>

      {getCourses().map((course) => {
        const lessons = allLessons(course)
        const done = lessons.filter((l) => (data.lessonsCompleted[l.id] ?? 0) > 0).length
        const pct = Math.round((done / lessons.length) * 100)
        const due = dueItems(data.srs[course.id] ?? [], now).length
        return (
          <button
            key={course.id}
            className="card"
            onClick={() => navigate(`/cours/${course.id}`)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 12,
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--text)',
            }}
          >
            <span style={{ fontSize: 40 }}>{course.flag}</span>
            <span style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{course.title}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                {done}/{lessons.length} leçons · {pct}%
              </div>
              {due > 0 && (
                <div style={{ color: 'var(--blue)', fontSize: 14, fontWeight: 700 }}>
                  📝 {due} mot{due > 1 ? 's' : ''} à réviser
                </div>
              )}
            </span>
            <span style={{ fontSize: 22, color: 'var(--text-dim)' }}>›</span>
          </button>
        )
      })}
    </div>
  )
}
