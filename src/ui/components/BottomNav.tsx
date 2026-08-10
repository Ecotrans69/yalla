import { useRouter } from '../Router'

const TABS = [
  { path: '/', icon: '🏠', label: 'Accueil' },
  { path: '/classement', icon: '🏆', label: 'Famille' },
  { path: '/reglages', icon: '⚙️', label: 'Réglages' },
]

export function BottomNav() {
  const { path, navigate } = useRouter()
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--card)',
        borderTop: '2px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 10,
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.path}
          onClick={() => navigate(t.path)}
          aria-label={t.label}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 24,
            padding: '10px 20px',
            cursor: 'pointer',
            opacity: path === t.path ? 1 : 0.45,
            borderTop: path === t.path ? '3px solid var(--green)' : '3px solid transparent',
          }}
        >
          {t.icon}
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{t.label}</div>
        </button>
      ))}
    </nav>
  )
}
