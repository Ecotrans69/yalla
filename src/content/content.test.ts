import { describe, it, expect } from 'vitest'
import { getCourses, getCourse, validateCourse, allLessons, findLesson } from './index'
import type { Course } from './types'

describe('contenu', () => {
  it('retourne les 3 cours en/ar/dz', () => {
    const ids = getCourses().map((c) => c.id)
    expect(ids).toEqual(['en', 'ar', 'dz'])
  })

  it('chaque cours seed est valide', () => {
    for (const c of getCourses()) {
      expect(validateCourse(c), `cours ${c.id}`).toEqual([])
    }
  })

  it('détecte les ids dupliqués', () => {
    const c = structuredClone(getCourse('en')!) as Course
    c.units[0].lessons[0].items![1].id = c.units[0].lessons[0].items![0].id
    expect(validateCourse(c).some((e) => e.includes('dupliqué'))).toBe(true)
  })

  it('détecte un item arabe sans phonétique', () => {
    const c: Course = {
      id: 'ar',
      title: 'test',
      flag: '',
      ttsLang: 'ar-SA',
      sttLang: 'ar-SA',
      units: [
        {
          id: 'u1',
          title: 'u',
          icon: '',
          lessons: [
            {
              id: 'l1',
              title: 'l',
              kind: 'vocab',
              items: [{ id: 'i1', text: 'سلام', fr: 'salut' }],
            },
          ],
        },
      ],
    }
    expect(validateCourse(c).some((e) => e.includes('phon'))).toBe(true)
  })

  it('détecte un item darija sans arScript', () => {
    const c: Course = {
      id: 'dz',
      title: 'test',
      flag: '',
      ttsLang: 'ar-SA',
      sttLang: 'ar-DZ',
      units: [
        {
          id: 'u1',
          title: 'u',
          icon: '',
          lessons: [
            {
              id: 'l1',
              title: 'l',
              kind: 'vocab',
              items: [{ id: 'i1', text: 'salam', fr: 'salut' }],
            },
          ],
        },
      ],
    }
    expect(validateCourse(c).some((e) => e.includes('arScript'))).toBe(true)
  })

  it('détecte une leçon letters sans lettres', () => {
    const c = structuredClone(getCourse('ar')!) as Course
    c.units[0].lessons[0].letters = []
    expect(validateCourse(c).some((e) => e.includes('sans lettres'))).toBe(true)
  })

  it('findLesson et allLessons fonctionnent', () => {
    const en = getCourse('en')!
    expect(allLessons(en).length).toBeGreaterThanOrEqual(2)
    const found = findLesson(en, 'en-u1-l2')
    expect(found?.lesson.title).toBe('Je me présente')
    expect(findLesson(en, 'inexistant')).toBeUndefined()
  })
})
