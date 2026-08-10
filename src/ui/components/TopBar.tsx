import { useEffect, useState } from 'react'
import { useApp } from '../../store/state'
import { currentHearts, displayStreak, MAX_HEARTS } from '../../engine/gamification'

export function TopBar() {
  const { profile, data } = useApp()
  const [, tick] = useState(0)

  // rafraîchit l'affichage des cœurs toutes les 30 s
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!profile || !data) return null
  const now = Date.now()
  const hearts = currentHearts(data.hearts, now)
  const streak = displayStreak(data.streak, now)
  const totalXp = Object.values(data.xpByDay).reduce((a, b) => a + b, 0)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 640,
        margin: '0 auto',
        padding: '12px 16px',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 26 }} title={profile.name}>
        {profile.avatar}
      </span>
      <span className="pill" style={{ color: streak > 0 ? '#ff9600' : 'var(--text-dim)' }}>
        🔥 {streak}
      </span>
      <span className="pill" style={{ color: 'var(--gold-dark)' }}>
        ⚡ {totalXp}
      </span>
      <span className="pill" style={{ color: 'var(--red)' }}>
        ❤️ {profile.kid ? '∞' : `${hearts.count}/${MAX_HEARTS}`}
      </span>
    </div>
  )
}
