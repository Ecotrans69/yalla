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
