import { useState } from 'react'
import { getCourse } from '../../content'
import { loadTrash, type Profile, type TrashEntry } from '../../store/storage'
import { ImportButton } from '../components/ImportButton'
import { RappelSettings } from '../components/RappelSettings'
import { playItem, VOICE_LABELS } from '../../speech/audio'
import { sttAvailable } from '../../speech/stt'
import { useApp } from '../../store/state'
import { useRouter } from '../Router'

const GOALS = [10, 20, 30, 50]

const RATES: [number, string][] = [
  [0.7, '🐌 Très lente'],
  [0.85, '🐢 Lente'],
  [1, '▶️ Normale'],
  [1.15, '⚡ Rapide'],
]

/**
 * Suppression de profil : réservée aux parents, derrière une petite
 * multiplication — un enfant de 6 ans ne la franchit pas par réflexe.
 * Toute suppression part d'abord en corbeille (restaurable).
 */
function ManageProfiles() {
  const { state, profile, deleteProfile, restoreProfile } = useApp()
  const [cible, setCible] = useState<Profile | null>(null)
  const [calcul, setCalcul] = useState<{ a: number; b: number }>({ a: 7, b: 8 })
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState(false)
  const [corbeille, setCorbeille] = useState<TrashEntry[]>(() => loadTrash())

  const demander = (p: Profile) => {
    setCible(p)
    setSaisie('')
    setErreur(false)
    setCalcul({ a: 3 + Math.floor(Math.random() * 7), b: 3 + Math.floor(Math.random() * 7) })
  }

  const confirmer = () => {
    if (!cible) return
    if (Number(saisie.trim()) !== calcul.a * calcul.b) {
      setErreur(true)
      return
    }
    deleteProfile(cible.id)
    setCible(null)
    setCorbeille(loadTrash())
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>👨‍👩‍👧 Gérer les profils</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
        Réservé aux parents — une suppression efface toute la progression du profil.
      </div>
      {state.profiles.map((p) => (
        <div
          key={p.id}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}
        >
          <span style={{ fontSize: 24 }}>{p.avatar}</span>
          <span style={{ flex: 1, fontWeight: 700 }}>
            {p.name}
            {p.id === profile?.id && ' (toi)'}
          </span>
          <button className="btn btn-danger" onClick={() => demander(p)}>
            Supprimer
          </button>
        </div>
      ))}

      {corbeille.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '2px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>🗑 Suppressions récentes</div>
          {corbeille.map((e) => (
            <button
              key={e.profile.id}
              className="btn btn-ghost"
              style={{ width: '100%', marginBottom: 6 }}
              onClick={() => {
                restoreProfile(e.profile.id)
                setCorbeille(loadTrash())
              }}
            >
              ↩️ Restaurer {e.profile.avatar} {e.profile.name}
            </button>
          ))}
        </div>
      )}

      {cible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 40,
          }}
          onClick={() => setCible(null)}
        >
          <div className="card pop" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Supprimer ce profil ?</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
              Toute la progression sera perdue (restaurable ici pendant un moment). Pour
              confirmer, réponds à cette question :
            </p>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              Combien font {calcul.a} × {calcul.b} ?
            </div>
            <input
              value={saisie}
              onChange={(e) => {
                setSaisie(e.target.value)
                setErreur(false)
              }}
              inputMode="numeric"
              aria-label="Réponse au calcul"
              style={{
                width: '100%',
                padding: 12,
                fontSize: 17,
                borderRadius: 12,
                border: `2px solid ${erreur ? 'var(--red)' : 'var(--border)'}`,
                background: 'var(--bg)',
                color: 'var(--text)',
                marginBottom: 12,
              }}
            />
            {erreur && (
              <div style={{ color: 'var(--red-ink)', marginBottom: 8 }}>
                Ce n'est pas la bonne réponse.
              </div>
            )}
            <button
              className="btn btn-danger"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={confirmer}
            >
              Supprimer définitivement
            </button>
            <button
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => setCible(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function sampleItem(courseId: string) {
  const course = getCourse(courseId)!
  const lesson = course.units.flatMap((u) => u.lessons).find((l) => l.kind === 'vocab')
  return { course, item: lesson!.items![0] }
}

export function SettingsScreen() {
  const { profile, data, setGoal, setTheme, setVoice, setRate, exportActive, selectProfile } =
    useApp()
  const { navigate } = useRouter()
  if (!profile || !data) return null

  const doExport = () => {
    const blob = new Blob([exportActive()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yalla-${profile.name.toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="screen">
      <h1 style={{ fontSize: 24 }}>⚙️ Réglages</h1>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🎯 Objectif quotidien</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {GOALS.map((g) => (
            <button
              key={g}
              className={`btn-choice ${data.dailyGoal === g ? 'selected' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setGoal(g)}
            >
              {g} XP
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🌓 Thème</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(
            [
              [undefined, 'Auto'],
              ['light', 'Clair'],
              ['dark', 'Sombre'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              className={`btn-choice ${data.theme === value ? 'selected' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setTheme(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🗣️ Voix</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {VOICE_LABELS.map(([value, label]) => (
            <button
              key={value}
              className={`btn-choice ${(data.voice ?? 'mix') === value ? 'selected' : ''}`}
              onClick={() => setVoice(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontWeight: 800, margin: '12px 0 8px' }}>⏩ Vitesse de la voix</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {RATES.map(([value, label]) => (
            <button
              key={value}
              className={`btn-choice ${(data.rate ?? 1) === value ? 'selected' : ''}`}
              onClick={() => setRate(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-blue"
            onClick={() => {
              const { course, item } = sampleItem('en')
              void playItem(item, course, false, data.voice ?? 'mix', data.rate ?? 1)
            }}
          >
            🔊 Essayer en anglais
          </button>
          <button
            className="btn btn-blue"
            onClick={() => {
              const { course, item } = sampleItem('ar')
              void playItem(item, course, false, data.voice ?? 'mix', data.rate ?? 1)
            }}
          >
            🔊 Essayer en arabe
          </button>
          <button
            className="btn btn-blue"
            onClick={() => {
              const { course, item } = sampleItem('dz')
              void playItem(item, course, false, data.voice ?? 'mix', data.rate ?? 1)
            }}
          >
            🔊 Essayer en darija
          </button>
        </div>
        {!sttAvailable() && (
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 0 }}>
            ℹ️ Le micro n'est pas géré par ce navigateur : les exercices « répète » deviennent des
            exercices d'écoute.
          </p>
        )}
      </div>

      <RappelSettings />

      {/* Section parents : masquée sur un profil enfant (un import écrase
          la progression, et « changer de profil » mène à la suppression) */}
      {!profile.kid && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>💾 Sauvegarde</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <button className="btn btn-ghost" onClick={doExport}>
                Exporter ma progression
              </button>
            </div>
            <ImportButton label="📥 Importer une sauvegarde" />
          </div>

          <button
            className="btn btn-ghost"
            style={{ width: '100%', marginBottom: 12 }}
            onClick={() => {
              selectProfile(undefined)
              navigate('/profils')
            }}
          >
            👥 Changer de profil
          </button>

          <ManageProfiles />
        </>
      )}

      <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
        Yalla! v1 — l'anglais, l'arabe et la darija, fait avec ❤️ pour la famille.
        <br />
        Tes données restent sur cet appareil, rien n'est envoyé sur internet.
      </p>
    </div>
  )
}
