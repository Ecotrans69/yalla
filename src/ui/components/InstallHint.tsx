import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

const DISMISS_KEY = 'yalla.installHintDismissed'

function isStandalone(): boolean {
  return (
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Bannière discrète qui explique comment installer l'app sur l'écran d'accueil */
export function InstallHint() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || isStandalone()) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      className="card"
      style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <span style={{ fontSize: 28 }}>📲</span>
      <span style={{ flex: 1, fontSize: 14 }}>
        {isIos() ? (
          <>
            Installe Yalla! sur ton écran d'accueil : bouton <strong>Partager</strong> puis «{' '}
            <strong>Sur l'écran d'accueil</strong> »
          </>
        ) : promptEvent ? (
          <button className="btn btn-primary" onClick={() => void promptEvent.prompt()}>
            Installer l'application
          </button>
        ) : (
          <>
            Installe Yalla! sur ton écran d'accueil depuis le menu du navigateur («{' '}
            <strong>Ajouter à l'écran d'accueil</strong> »)
          </>
        )}
      </span>
      <button
        aria-label="Fermer"
        onClick={dismiss}
        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  )
}
