import { describe, it, expect } from 'vitest'
import { levenshtein, similarity, checkTyped, checkSpoken } from './scoring'

describe('levenshtein / similarity', () => {
  it('identiques → 1', () => {
    expect(similarity('hello', 'hello')).toBe(1)
  })
  it('une faute sur 5 lettres → 0.8', () => {
    expect(levenshtein('helo', 'hello')).toBe(1)
    expect(similarity('helo', 'hello')).toBeCloseTo(0.8)
  })
  it('vides → 1', () => {
    expect(similarity('', '')).toBe(1)
  })
})

describe('checkTyped', () => {
  it('ponctuation et casse ignorées', () => {
    expect(checkTyped('Hello!', 'hello', 'en').ok).toBe(true)
  })
  it('faute trop grosse refusée (seuil 0.85)', () => {
    expect(checkTyped('helo', 'hello', 'en').ok).toBe(false)
  })
  it('longue phrase avec 1 typo acceptée', () => {
    expect(checkTyped('good morninng', 'good morning', 'en').ok).toBe(true)
  })
})

describe('checkSpoken', () => {
  it('arabe : diacritiques ignorées', () => {
    const r = checkSpoken(
      'السلام عليكم',
      { id: 'x', text: 'السَّلام عليكم', fr: 'bonjour', phon: 'assalamou alaykoum' },
      'ar',
      false
    )
    expect(r.ok).toBe(true)
    expect(r.score).toBe(1)
  })

  it('darija : reco en écriture arabe matche via arScript', () => {
    const r = checkSpoken(
      'صباح الخير',
      { id: 'x', text: 'sbah el khir', fr: 'bonjour', arScript: 'صباح الخير' },
      'dz',
      false
    )
    expect(r.ok).toBe(true)
  })

  it('darija : reco déjà en latin matche direct', () => {
    const r = checkSpoken(
      'sbah el khir',
      { id: 'x', text: 'sbah el khir', fr: 'bonjour', arScript: 'صباح الخير' },
      'dz',
      false
    )
    expect(r.ok).toBe(true)
  })

  it('anglais adulte : seuil 0.7', () => {
    expect(checkSpoken('hello', { id: 'x', text: 'hello', fr: 'bonjour' }, 'en', false).ok).toBe(
      true
    )
    expect(
      checkSpoken('completely wrong', { id: 'x', text: 'hello', fr: 'bonjour' }, 'en', false).ok
    ).toBe(false)
  })

  it('enfant : seuil plus tolérant (0.55)', () => {
    const approx = checkSpoken('helo word', { id: 'x', text: 'hello world', fr: 'x' }, 'en', true)
    expect(approx.ok).toBe(true)
    const adult = checkSpoken('helo word', { id: 'x', text: 'hello world', fr: 'x' }, 'en', false)
    expect(adult.score).toBeLessThan(0.9)
  })
})
