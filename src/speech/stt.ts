/** Reconnaissance vocale — moteur du téléphone (souvent besoin d'internet) */

type SpeechRecognitionCtor = new () => {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}

function getCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as SpeechRecognitionCtor | undefined
}

export function sttAvailable(): boolean {
  return !!getCtor()
}

function frMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Micro non autorisé — autorise le micro dans ton navigateur'
    case 'no-speech':
      return "Je n'ai rien entendu, réessaie en parlant plus fort"
    case 'network':
      return "La reconnaissance vocale a besoin d'internet"
    case 'audio-capture':
      return 'Aucun micro trouvé sur cet appareil'
    case 'aborted':
      return 'Écoute annulée'
    default:
      return 'Erreur du micro, réessaie'
  }
}

let current: { abort(): void } | null = null

/** Écoute une fois et renvoie le texte reconnu. Rejette avec un message FR. */
export function recognize(lang: string): Promise<string> {
  const Ctor = getCtor()
  if (!Ctor) return Promise.reject(new Error('Reconnaissance vocale non disponible'))
  return new Promise((resolve, reject) => {
    const rec = new Ctor()
    current = rec
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 3
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      current = null
      fn()
    }
    const timer = setTimeout(() => {
      try {
        rec.abort()
      } catch {
        // déjà arrêté
      }
      settle(() => reject(new Error("Je n'ai rien entendu, réessaie")))
    }, 8_000)
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? ''
      settle(() => resolve(transcript))
    }
    rec.onerror = (e) => {
      settle(() => reject(new Error(frMessage(e.error))))
    }
    rec.onend = () => {
      settle(() => reject(new Error("Je n'ai rien entendu, réessaie")))
    }
    try {
      rec.start()
    } catch {
      settle(() => reject(new Error('Erreur du micro, réessaie')))
    }
  })
}

export function abortRecognition(): void {
  try {
    current?.abort()
  } catch {
    // rien à annuler
  }
  current = null
}
