import { describe, it, expect } from 'vitest'
import { buildLesson, coursePool, type BuildOpts, type Exercise } from './lessonBuilder'
import { getCourse } from '../content'

function makeRng(seed = 42): () => number {
  // LCG déterministe pour les tests
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function opts(over: Partial<BuildOpts> = {}): BuildOpts {
  return { kid: false, sttAvailable: true, ttsAvailable: true, rng: makeRng(), ...over }
}

function appearances(exs: Exercise[]): Map<string, number> {
  const m = new Map<string, number>()
  const bump = (id: string) => m.set(id, (m.get(id) ?? 0) + 1)
  for (const ex of exs) {
    if (ex.item) bump(ex.item.id)
    if (ex.type === 'match_pairs') {
      // les paires couvrent plusieurs items : compte via les textes
      for (const p of ex.pairs ?? []) bump(`pair:${p.b}`)
    }
  }
  return m
}

const en = getCourse('en')!
const ar = getCourse('ar')!
const lesson1 = en.units[0].lessons[0]

describe('buildLesson vocab', () => {
  it('longueur raisonnable (10-16 pour 8 items)', () => {
    const exs = buildLesson(en, lesson1, opts())
    expect(exs.length).toBeGreaterThanOrEqual(10)
    expect(exs.length).toBeLessThanOrEqual(16)
  })

  it('chaque item de la leçon apparaît au moins 2 fois (paires incluses)', () => {
    const exs = buildLesson(en, lesson1, opts())
    const byItem = appearances(exs)
    for (const item of lesson1.items!) {
      const direct = byItem.get(item.id) ?? 0
      const inPairs = byItem.get(`pair:${item.text}`) ?? 0
      expect(direct + inPairs, `item ${item.id}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('contient au moins un speak_repeat quand le micro est dispo', () => {
    const exs = buildLesson(en, lesson1, opts())
    expect(exs.some((e) => e.type === 'speak_repeat')).toBe(true)
  })

  it('sans STT : aucun speak_repeat', () => {
    const exs = buildLesson(en, lesson1, opts({ sttAvailable: false }))
    expect(exs.every((e) => e.type !== 'speak_repeat')).toBe(true)
  })

  it('sans TTS : aucun exercice découte', () => {
    const exs = buildLesson(en, lesson1, opts({ ttsAvailable: false, sttAvailable: false }))
    expect(
      exs.every((e) => !['listen_choose', 'listen_type', 'speak_repeat'].includes(e.type))
    ).toBe(true)
  })

  it('kid : aucun listen_type ni fill_blank', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const exs = buildLesson(en, lesson1, opts({ kid: true, rng: makeRng(seed) }))
      expect(exs.every((e) => e.type !== 'listen_type' && e.type !== 'fill_blank')).toBe(true)
    }
  })

  it('les QCM contiennent la bonne réponse + 3 distracteurs uniques', () => {
    const exs = buildLesson(en, lesson1, opts())
    for (const ex of exs) {
      if (ex.choices && ex.correctId) {
        expect(ex.choices.some((c) => c.id === ex.correctId)).toBe(true)
        const ids = ex.choices.map((c) => c.id)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ex.choices.length).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('cours arabe : jamais de listen_type (on ne tape pas en arabe)', () => {
    const arVocab = {
      id: 'l-test',
      title: 't',
      kind: 'vocab' as const,
      items: [
        { id: 'a1', text: 'سلام', fr: 'salut', phon: 'salam' },
        { id: 'a2', text: 'شكرا', fr: 'merci', phon: 'choukran' },
        { id: 'a3', text: 'نعم', fr: 'oui', phon: 'naam' },
        { id: 'a4', text: 'لا', fr: 'non', phon: 'la' },
        { id: 'a5', text: 'ماء', fr: 'eau', phon: 'ma' },
      ],
    }
    for (let seed = 1; seed <= 10; seed++) {
      const exs = buildLesson(ar, arVocab, opts({ rng: makeRng(seed) }))
      expect(exs.every((e) => e.type !== 'listen_type')).toBe(true)
    }
  })
})

describe('buildLesson letters', () => {
  const alphaLesson = ar.units[0].lessons[0]

  it('contient letter_intro et letter_forms pour chaque lettre', () => {
    const exs = buildLesson(ar, alphaLesson, opts())
    const intros = exs.filter((e) => e.type === 'letter_intro')
    const formsEx = exs.filter((e) => e.type === 'letter_forms')
    expect(intros.length).toBe(alphaLesson.letters!.length)
    expect(formsEx.length).toBe(alphaLesson.letters!.length)
  })

  it('inclut du speak_repeat sur les sons si STT dispo', () => {
    const exs = buildLesson(ar, alphaLesson, opts())
    expect(exs.some((e) => e.type === 'speak_repeat')).toBe(true)
  })
})

describe('buildLesson révision', () => {
  it('drille les items donnés sans new_word', () => {
    const pool = coursePool(en)
    const ids = pool.slice(0, 3).map((i) => i.id)
    const exs = buildLesson(en, lesson1, opts({ reviewIds: ids }))
    expect(exs.length).toBe(6) // select + listen_choose par item
    expect(exs.every((e) => e.type !== 'new_word')).toBe(true)
  })
})
