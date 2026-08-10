import { describe, it, expect } from 'vitest'
import { normalize, translitArToLatin } from './normalize'

describe('normalize', () => {
  it('anglais : minuscules, sans ponctuation', () => {
    expect(normalize('Hello, World!', 'en')).toBe('hello world')
  })

  it('arabe : supprime les diacritiques', () => {
    expect(normalize('السَّلامُ عَلَيْكُم', 'ar')).toBe('السلام عليكم')
  })

  it('arabe : unifie les alifs et ta marbuta', () => {
    expect(normalize('أهلاً', 'ar')).toBe('اهلا')
    expect(normalize('مدرسة', 'ar')).toBe('مدرسه')
  })

  it('français : garde les accents', () => {
    expect(normalize('Ça va ?', 'fr')).toBe('ça va')
  })

  it('espaces multiples réduits', () => {
    expect(normalize('  good   morning ', 'en')).toBe('good morning')
  })
})

describe('translitArToLatin', () => {
  it('translittère des mots simples', () => {
    expect(translitArToLatin('سلام')).toBe('slam')
    expect(translitArToLatin('مرحبا')).toBe('mrhba')
  })

  it('gère les digrammes (kh, ch, ou)', () => {
    expect(translitArToLatin('خبز')).toBe('khbz')
    expect(translitArToLatin('شمس')).toBe('chms')
  })

  it('conserve les espaces entre mots', () => {
    expect(translitArToLatin('صباح الخير')).toBe('sbah alkhir')
  })
})
