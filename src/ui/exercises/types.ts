import type { Course } from '../../content/types'
import type { Exercise } from '../../engine/lessonBuilder'

export interface ExerciseProps {
  ex: Exercise
  course: Course
  kid: boolean
  /** Appelé UNE fois quand l'exercice est résolu. note = message complémentaire (score vocal…) */
  onAnswer(correct: boolean, note?: string): void
}

/** Classe CSS pour afficher la langue cible (gros + RTL pour l'arabe) */
export function targetClass(course: Course): string {
  return course.id === 'ar' ? 'arabic' : ''
}

/**
 * Attributs de langue à poser sur le texte en langue cible.
 * Sans eux, VoiceOver lit l'arabe avec la voix française (charabia).
 */
export function targetAttrs(course: Course): { lang?: string; dir?: 'rtl' } {
  return course.id === 'ar' ? { lang: 'ar', dir: 'rtl' } : { lang: 'en' }
}

/** Attributs pour un texte toujours en écriture arabe (darija, lettres) */
export const AR_ATTRS = { lang: 'ar', dir: 'rtl' } as const
