import { useState } from 'react'
import {
  demanderPermission,
  formaterHeure,
  icsQuotidien,
  nomFichierIcs,
  peutNotifier,
  PREFS_DEFAUT,
  type ReminderPrefs,
} from '../../engine/reminders'
import { useApp } from '../../store/state'

const HEURES = [7, 8, 12, 16, 17, 18, 19, 20]
const MINUTES = [0, 15, 30, 45]

/**
 * Rappel quotidien.
 *
 * Honnêteté technique : l'app est un site statique, sans serveur — elle ne PEUT
 * PAS envoyer de notification quand elle est fermée. Le vrai rappel de tous les
 * jours passe donc par le calendrier du téléphone (fichier .ics récurrent), qui
 * fonctionne sur iPhone comme sur Android. Les notifications du navigateur ne
 * servent qu'en complément, quand l'app est ouverte.
 */
export function RappelSettings() {
  const { profile, data, setRappel } = useApp()
  const [msg, setMsg] = useState('')
  const prefs: ReminderPrefs = data?.rappel ?? PREFS_DEFAUT

  if (!profile || !data) return null

  const maj = (patch: Partial<ReminderPrefs>) => setRappel({ ...prefs, ...patch })

  const telechargerIcs = () => {
    const contenu = icsQuotidien({ heure: prefs.heure, minute: prefs.minute, prenom: profile.name })
    // Blob plutôt que data: URL — les navigateurs mobiles bloquent souvent la
    // navigation vers une data: URL, or c'est justement la cible ici.
    const blob = new Blob([contenu], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomFichierIcs(profile.name)
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    setMsg("📅 Ouvre le fichier téléchargé, puis « Ajouter » — le rappel sonnera tous les jours.")
  }

  const activerNotifs = async () => {
    const ok = await demanderPermission()
    setMsg(
      ok
        ? '🔔 Notifications autorisées : Fenek te préviendra quand l’app est ouverte.'
        : "🔕 Notifications refusées. Le rappel du calendrier marche quand même, lui."
    )
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>⏰ Rappel quotidien</div>
      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
        Un petit rappel chaque jour pour ne pas casser la série.
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={prefs.actif}
          onChange={(e) => maj({ actif: e.target.checked })}
          style={{ width: 22, height: 22 }}
        />
        <span style={{ fontWeight: 700 }}>
          Activer le rappel {prefs.actif && `à ${formaterHeure(prefs)}`}
        </span>
      </label>

      {prefs.actif && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {HEURES.map((h) => (
              <button
                key={h}
                className={`btn-choice ${prefs.heure === h ? 'selected' : ''}`}
                style={{ minWidth: 56, padding: '10px 8px' }}
                onClick={() => maj({ heure: h })}
              >
                {h}h
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {MINUTES.map((m) => (
              <button
                key={m}
                className={`btn-choice ${prefs.minute === m ? 'selected' : ''}`}
                style={{ minWidth: 56, padding: '10px 8px' }}
                onClick={() => maj({ minute: m })}
              >
                {m === 0 ? 'pile' : `+${m} min`}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={telechargerIcs}>
            📅 Mettre le rappel dans mon téléphone
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '8px 0 12px' }}>
            C'est le seul rappel qui sonne même quand l'app est fermée : il s'ajoute au
            calendrier du téléphone, tous les jours à {formaterHeure(prefs)}.
          </div>

          {!peutNotifier() && (
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => void activerNotifs()}>
              🔔 Autoriser les notifications (app ouverte)
            </button>
          )}
        </>
      )}

      {msg && (
        <p role="status" style={{ marginBottom: 0, fontSize: 14 }}>
          {msg}
        </p>
      )}
    </div>
  )
}
