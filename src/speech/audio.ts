import type { Course, VocabItem } from '../content/types'
import { speakItem, stopSpeaking } from './tts'

/**
 * Lecteur des voix neurales pré-générées (fichiers audio/{id}.{voix}.mp3).
 * Si le fichier manque ou ne se charge pas (pas encore en cache hors-ligne),
 * bascule automatiquement sur la voix du téléphone (speechSynthesis).
 */

export type VoiceChoice = 'h' | 'f' | 'e' | 'mix'

export const VOICE_LABELS: [VoiceChoice, string][] = [
  ['mix', '🔀 Mélange'],
  ['h', '🧔 Homme'],
  ['f', '👩 Femme'],
  ['e', '🧒 Enfant (anglais)'],
]

let current: HTMLAudioElement | null = null

export function stopAudio(): void {
  if (current) {
    current.pause()
    current = null
  }
  stopSpeaking()
}

/** Variante réellement jouée : l'enfant n'existe qu'en anglais, mix = aléatoire */
export function pickVariant(course: Course, choice: VoiceChoice, rng: () => number = Math.random): 'h' | 'f' | 'e' {
  if (choice === 'mix') {
    const variants: ('h' | 'f' | 'e')[] = course.id === 'en' ? ['h', 'f', 'e'] : ['h', 'f']
    return variants[Math.floor(rng() * variants.length)]
  }
  if (choice === 'e' && course.id !== 'en') return 'f'
  return choice
}

export function audioUrl(itemId: string, variant: 'h' | 'f' | 'e'): string {
  return `${import.meta.env.BASE_URL}audio/${itemId}.${variant}.mp3`
}

/** Vitesse réellement appliquée : la tortue ralentit encore par rapport au réglage */
export function effectiveRate(rate: number, slow: boolean): number {
  return slow ? Math.max(0.5, Math.round(rate * 0.7 * 100) / 100) : rate
}

/** Joue un item avec la voix neurale choisie, fallback voix du téléphone */
export function playItem(
  item: VocabItem,
  course: Course,
  slow = false,
  choice: VoiceChoice = 'mix',
  rate = 1
): Promise<void> {
  stopAudio()
  return new Promise((resolve) => {
    const variant = pickVariant(course, choice)
    const audio = new Audio(audioUrl(item.id, variant))
    audio.playbackRate = effectiveRate(rate, slow)
    current = audio
    const fallback = () => {
      current = null
      void speakItem(item, course, slow, rate).then(resolve)
    }
    audio.onended = () => {
      current = null
      resolve()
    }
    audio.onerror = fallback
    try {
      const p = audio.play()
      if (p && typeof p.catch === 'function') p.catch(fallback)
    } catch {
      fallback()
    }
  })
}
