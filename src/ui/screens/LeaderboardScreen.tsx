import { BADGES } from '../../engine/gamification'
import { computeBadgeStats, weekXp, type ProfileData } from '../../store/storage'
import { getCourses } from '../../content'
import { earnedBadges } from '../../engine/gamification'
import { useApp } from '../../store/state'

const MEDALS = ['🥇', '🥈', '🥉']

export function LeaderboardScreen() {
  const { state, profile, data } = useApp()
  const now = Date.now()

  const ranked = state.profiles
    .map((p) => ({
      p,
      xp: state.data[p.id] ? weekXp(state.data[p.id] as ProfileData, now) : 0,
    }))
    .sort((a, b) => b.xp - a.xp)

  const badges = data ? earnedBadges(computeBadgeStats(data, getCourses())) : []

  return (
    <div className="screen">
      <h1 style={{ fontSize: 24 }}>🏆 Classement de la semaine</h1>
      {ranked.map(({ p, xp }, i) => (
        <div
          key={p.id}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 10,
            borderColor: p.id === profile?.id ? 'var(--green)' : undefined,
            borderWidth: p.id === profile?.id ? 3 : 2,
          }}
        >
          <span style={{ fontSize: 24, width: 32 }}>{MEDALS[i] ?? `${i + 1}.`}</span>
          <span style={{ fontSize: 30 }}>{p.avatar}</span>
          <span style={{ flex: 1, fontWeight: 800 }}>
            {p.name}
            {p.id === profile?.id && ' (toi)'}
          </span>
          <span className="pill" style={{ color: 'var(--gold-dark)' }}>⚡ {xp} XP</span>
        </div>
      ))}
      {ranked.length < 2 && (
        <p style={{ color: 'var(--text-dim)' }}>
          Ajoute d'autres profils de la famille pour vous défier ! 😄
        </p>
      )}

      <h2 style={{ fontSize: 20, marginTop: 28 }}>Tes badges</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {BADGES.map((b) => {
          const won = badges.includes(b.id)
          return (
            <div key={b.id} className="card" style={{ opacity: won ? 1 : 0.4, textAlign: 'center' }}>
              <div style={{ fontSize: 34, filter: won ? 'none' : 'grayscale(1)' }}>{b.emoji}</div>
              <div style={{ fontWeight: 800 }}>{b.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{b.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
