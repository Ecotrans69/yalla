import type { Course, VocabItem } from '../content/types'

/** Synthèse vocale — voix intégrées au téléphone (marche hors-ligne) */

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let voices: SpeechSynthesisVoice[] = []

function refreshVoices() {
  if (!ttsAvailable()) return
  voices = window.speechSynthesis.getVoices()
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  refreshVoices()
  window.speechSynthesis.onvoiceschanged = refreshVoices
}

/** Meilleure voix pour une langue : correspondance exacte, sinon même préfixe */
export function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  refreshVoices()
  const prefix = lang.split('-')[0].toLowerCase()
  const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === lang.toLowerCase())
  if (exact) return exact
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix))
}

/** Y a-t-il une voix installée pour cette langue ? (ex: 'ar') */
export function hasVoiceFor(langPrefix: string): boolean {
  refreshVoices()
  const p = langPrefix.toLowerCase()
  return voices.some((v) => v.lang.toLowerCase().startsWith(p))
}

/** Prononce un texte. Résout à la fin (ou après 10 s de garde-fou). */
export function speak(text: string, lang: string, rate = 1): Promise<void> {
  if (!ttsAvailable()) return Promise.resolve()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = rate
  const voice = pickVoice(lang)
  if (voice) u.voice = voice
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(finish, 10_000)
    u.onend = finish
    u.onerror = finish
    window.speechSynthesis.speak(u)
  })
}

/** Prononce un item dans la langue du cours (darija → écriture arabe) */
export function speakItem(item: VocabItem, course: Course, slow = false): Promise<void> {
  const text = course.id === 'dz' ? (item.arScript ?? item.text) : item.text
  return speak(text, course.ttsLang, slow ? 0.6 : 1)
}

export function stopSpeaking(): void {
  if (ttsAvailable()) window.speechSynthesis.cancel()
}
