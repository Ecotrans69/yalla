import { useState } from 'react'
import { useApp } from '../../store/state'
import { useRouter } from '../Router'
import { ImportButton } from '../components/ImportButton'

const AVATARS = ['🦁', '🐯', '🐼', '🐸', '🦊', '🐰', '🦄', '🐢', '🐬', '🦉', '🐥', '🐨']

export function ProfilesScreen() {
  const { state, addProfile, selectProfile } = useApp()
  const { navigate } = useRouter()
  const [creating, setCreating] = useState(state.profiles.length === 0)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [kid, setKid] = useState(false)

  const create = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    addProfile(trimmed, avatar, kid)
    setName('')
    setCreating(false)
    navigate('/')
  }

  return (
    <div className="screen" style={{ paddingBottom: 24 }}>
      <h1 style={{ textAlign: 'center', color: 'var(--green)', fontSize: 40, margin: '24px 0 4px' }}>
        Yalla!
      </h1>
      <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 0 }}>
        Apprends l'anglais et l'arabe en famille 🚀
      </p>

      {state.profiles.length > 0 && (
        <>
          <h2 style={{ fontSize: 18 }}>Qui joue ?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {state.profiles.map((p) => (
              <div key={p.id} className="card" style={{ position: 'relative', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    selectProfile(p.id)
                    navigate('/')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    color: 'var(--text)',
                  }}
                >
                  <div style={{ fontSize: 48 }}>{p.avatar}</div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{p.name}</div>
                  {p.kid && <div className="pill" style={{ background: 'var(--green-soft)', color: 'var(--green-ink)' }}>enfant</div>}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {creating ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Nouveau profil</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom"
            aria-label="Prénom"
            maxLength={20}
            style={{
              width: '100%',
              padding: 12,
              fontSize: 17,
              borderRadius: 12,
              border: '2px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              marginBottom: 12,
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                aria-label={`avatar ${a}`}
                style={{
                  fontSize: 26,
                  padding: 6,
                  borderRadius: 12,
                  border: a === avatar ? '3px solid var(--green)' : '3px solid transparent',
                  background: 'var(--card)',
                  cursor: 'pointer',
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <input type="checkbox" checked={kid} onChange={(e) => setKid(e.target.checked)} />
            Profil enfant (pas de vies, exercices plus simples)
          </label>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={create} disabled={!name.trim()}>
            C'est parti !
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => setCreating(true)}>
          + Nouveau profil
        </button>
      )}

      <div style={{ marginTop: 12 }}>
        <ImportButton />
      </div>
    </div>
  )
}
