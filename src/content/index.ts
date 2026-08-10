import type { Course, Lesson } from './types'
import anglais from './anglais.json'
import arabe from './arabe.json'
import darija from './darija.json'

const courses: Course[] = [
  anglais as unknown as Course,
  arabe as unknown as Course,
  darija as unknown as Course,
]

export function getCourses(): Course[] {
  return courses
}

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id)
}

export function findLesson(
  course: Course,
  lessonId: string
): { lesson: Lesson; unitIndex: number; lessonIndex: number } | undefined {
  for (let u = 0; u < course.units.length; u++) {
    const unit = course.units[u]
    for (let l = 0; l < unit.lessons.length; l++) {
      if (unit.lessons[l].id === lessonId) {
        return { lesson: unit.lessons[l], unitIndex: u, lessonIndex: l }
      }
    }
  }
  return undefined
}

/** Liste ordonnée de toutes les leçons du cours */
export function allLessons(course: Course): Lesson[] {
  return course.units.flatMap((u) => u.lessons)
}

/** Vérifie la cohérence d'un cours. Retourne la liste des erreurs ([] si OK). */
export function validateCourse(c: Course): string[] {
  const errors: string[] = []
  const seenIds = new Set<string>()

  const checkId = (id: string, where: string) => {
    if (seenIds.has(id)) errors.push(`id dupliqué "${id}" (${where})`)
    seenIds.add(id)
  }

  if (!['en', 'ar', 'dz'].includes(c.id)) errors.push(`id de cours inconnu "${c.id}"`)
  if (!c.ttsLang) errors.push(`${c.id}: ttsLang manquant`)
  if (!c.sttLang) errors.push(`${c.id}: sttLang manquant`)
  if (!c.units?.length) errors.push(`${c.id}: aucune unité`)

  for (const unit of c.units ?? []) {
    checkId(unit.id, `unité ${unit.title}`)
    if (!unit.lessons?.length) errors.push(`${unit.id}: aucune leçon`)
    for (const lesson of unit.lessons ?? []) {
      checkId(lesson.id, `leçon ${lesson.title}`)
      if (lesson.kind === 'letters') {
        if (!lesson.letters?.length) errors.push(`${lesson.id}: leçon "letters" sans lettres`)
        for (const letter of lesson.letters ?? []) {
          checkId(letter.id, `lettre ${letter.name}`)
          if (!letter.char || !letter.name || !letter.phon)
            errors.push(`${letter.id}: lettre incomplète`)
          if (
            !letter.forms?.isolated ||
            !letter.forms?.initial ||
            !letter.forms?.medial ||
            !letter.forms?.final
          )
            errors.push(`${letter.id}: formes manquantes`)
        }
      } else {
        if (!lesson.items?.length) errors.push(`${lesson.id}: leçon "vocab" sans items`)
        for (const item of lesson.items ?? []) {
          checkId(item.id, `item ${item.fr}`)
          if (!item.text) errors.push(`${item.id}: text manquant`)
          if (!item.fr) errors.push(`${item.id}: fr manquant`)
          if (c.id === 'ar' && !item.phon) errors.push(`${item.id}: phon manquant (arabe)`)
          if (c.id === 'dz' && !item.arScript)
            errors.push(`${item.id}: arScript manquant (darija)`)
        }
      }
    }
  }
  return errors
}
