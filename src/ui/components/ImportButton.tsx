import { useRef, useState } from 'react'
import { useApp } from '../../store/state'

/**
 * Restauration d'une sauvegarde. Présent AUSSI sur l'écran des profils :
 * sur un téléphone neuf il n'y a aucun profil, donc aucun accès aux Réglages.
 */
export function ImportButton({ label = '📥 Restaurer une sauvegarde' }: { label?: string }) {
  const { state, importJson } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const doImport = async (file: File) => {
    try {
      const texte = await file.text()
      // on nomme le profil écrasé avant d'écraser quoi que ce soit
      const existant = (() => {
        try {
          const id = (JSON.parse(texte) as { profile?: { id?: string } }).profile?.id
          return state.profiles.find((p) => p.id === id)
        } catch {
          return undefined
        }
      })()
      if (
        existant &&
        !window.confirm(
          `Cela va remplacer la progression de ${existant.name} par celle du fichier. Continuer ?`
        )
      ) {
        return
      }
      importJson(texte)
      setMsg('✅ Progression restaurée !')
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`)
    }
  }

  return (
    <>
      <button
        className="btn btn-ghost"
        style={{ width: '100%' }}
        onClick={() => fileRef.current?.click()}
      >
        {label}
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
      {msg && <p style={{ marginBottom: 0 }}>{msg}</p>}
    </>
  )
}
