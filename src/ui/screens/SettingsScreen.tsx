import { useRef, useState } from 'react'
import { hasVoiceFor, speak, ttsAvailable } from '../../speech/tts'
import { sttAvailable } from '../../speech/stt'
import { useApp } from '../../store/state'
import { useRouter } from '../Router'

const GOALS = [10, 20, 30, 50]

export function SettingsScreen() {
  const { profile, data, setGoal, setTheme, exportActive, importJson, selectProfile } = useApp()
  const { navigate } = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
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

  const doImport = async (file: File) => {
    try {
      importJson(await file.text())
      setMsg('✅ Progression importée !')
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`)
    }
  }

  const arVoiceOk = ttsAvailable() && hasVoiceFor('ar')

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
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🔊 Test des voix</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-blue" onClick={() => void speak('Hello! How are you today?', 'en-US')}>
            Anglais
          </button>
          <button className="btn btn-blue" onClick={() => void speak('السلام عليكم', 'ar-SA')}>
            Arabe
          </button>
        </div>
        {!arVoiceOk && (
          <p style={{ color: 'var(--red)', fontSize: 14, marginBottom: 0 }}>
            ⚠️ Aucune voix arabe détectée. Installe-la dans les réglages du téléphone
            (Accessibilité → Contenu énoncé → Voix sur iPhone ; Synthèse vocale sur Android).
          </p>
        )}
        {!sttAvailable() && (
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 0 }}>
            ℹ️ Le micro n'est pas géré par ce navigateur : les exercices « répète » deviennent des
            exercices d'écoute.
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>💾 Sauvegarde</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={doExport}>
            Exporter ma progression
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
        {msg && <p style={{ marginBottom: 0 }}>{msg}</p>}
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

      <p style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
        Yalla! v1 — fait avec ❤️ pour la famille.
        <br />
        Tes données restent sur cet appareil, rien n'est envoyé sur internet.
      </p>
    </div>
  )
}
