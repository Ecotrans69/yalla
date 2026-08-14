import { describe, it, expect } from 'vitest'
import { getCourse, getCourses, validateCourse } from './index'

/** Les 28 lettres de l'alphabet arabe (hors harakat et signes orthographiques) */
const ALPHABET_AR = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر',
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف',
  'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
]

/** Garde-fous de volume du contenu v1 (T13) */
describe('contenu complet', () => {
  it('tous les cours valides', () => {
    for (const c of getCourses()) expect(validateCourse(c), c.id).toEqual([])
  })

  it('anglais : 8 unités, ≥256 items', () => {
    const en = getCourse('en')!
    expect(en.units.length).toBe(8)
    const items = en.units.flatMap((u) => u.lessons.flatMap((l) => l.items ?? []))
    expect(items.length).toBeGreaterThanOrEqual(256)
  })

  it("arabe : les 28 lettres de l'alphabet + ≥144 items vocab", () => {
    const ar = getCourse('ar')!
    const letters = ar.units.flatMap((u) =>
      u.lessons.flatMap((l) => (l.kind === 'letters' ? (l.letters ?? []) : []))
    )
    // Les 28 lettres doivent TOUTES être enseignées. Les leçons "letters"
    // contiennent aussi les harakat (ـَ ـُ ـِ ـْ ـّ ـً) et les signes
    // orthographiques (ء أ إ آ ئ ة ى) : on ne compte donc plus les entrées,
    // on vérifie la couverture de l'alphabet.
    const chars = new Set(letters.map((l) => l.char))
    expect(ALPHABET_AR.length).toBe(28)
    for (const c of ALPHABET_AR) expect(chars.has(c), `lettre ${c} jamais enseignée`).toBe(true)
    // arName = source de l'audio : obligatoire sur chaque entrée (lettre ou signe)
    for (const l of letters) expect(!!l.arName, `${l.id} sans arName`).toBe(true)
    const items = ar.units.flatMap((u) => u.lessons.flatMap((l) => l.items ?? []))
    expect(items.length).toBeGreaterThanOrEqual(144)
    // phonétique partout
    expect(items.every((i) => !!i.phon)).toBe(true)
  })

  it('darija : 6 unités, ≥144 items, arScript partout', () => {
    const dz = getCourse('dz')!
    expect(dz.units.length).toBe(6)
    const items = dz.units.flatMap((u) => u.lessons.flatMap((l) => l.items ?? []))
    expect(items.length).toBeGreaterThanOrEqual(144)
    expect(items.every((i) => !!i.arScript)).toBe(true)
  })

  it('ids uniques sur les 3 cours confondus', () => {
    const all = getCourses().flatMap((c) =>
      c.units.flatMap((u) =>
        u.lessons.flatMap((l) => [
          ...(l.items ?? []).map((i) => i.id),
          ...(l.letters ?? []).map((x) => x.id),
        ])
      )
    )
    expect(new Set(all).size).toBe(all.length)
  })

  it('chaque unité a au moins 3 items enfants (hors alphabet)', () => {
    for (const c of getCourses()) {
      for (const u of c.units) {
        const items = u.lessons.flatMap((l) => l.items ?? [])
        if (items.length === 0) continue // unités alphabet
        const kids = items.filter((i) => i.kid).length
        expect(kids, `${c.id}/${u.id}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('assez de phrases multi-mots pour les tuiles (anglais ≥ 30%)', () => {
    const en = getCourse('en')!
    const items = en.units.flatMap((u) => u.lessons.flatMap((l) => l.items ?? []))
    const multi = items.filter((i) => i.text.trim().includes(' ')).length
    expect(multi / items.length).toBeGreaterThanOrEqual(0.3)
  })
})
