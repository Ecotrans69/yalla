import { describe, it, expect } from 'vitest'
import { onResult, dueItems, INTERVALS_DAYS, type SrsEntry } from './srs'

const DAY = 86_400_000
const T0 = 1_700_000_000_000

describe('onResult', () => {
  it('nouvel item correct → force 1', () => {
    expect(onResult(undefined, 'a', true, T0)).toEqual({ itemId: 'a', strength: 1, lastSeen: T0 })
  })
  it('nouvel item raté → force 0', () => {
    expect(onResult(undefined, 'a', false, T0).strength).toBe(0)
  })
  it('plafonne à 5', () => {
    let e: SrsEntry = { itemId: 'a', strength: 0, lastSeen: T0 }
    for (let i = 0; i < 8; i++) e = onResult(e, 'a', true, T0 + i)
    expect(e.strength).toBe(5)
  })
  it('erreur → -2, plancher 0', () => {
    expect(onResult({ itemId: 'a', strength: 3, lastSeen: T0 }, 'a', false, T0).strength).toBe(1)
    expect(onResult({ itemId: 'a', strength: 1, lastSeen: T0 }, 'a', false, T0).strength).toBe(0)
  })
})

describe('dueItems', () => {
  it('exclut les non dus, trie par force croissante', () => {
    const entries: SrsEntry[] = [
      { itemId: 'fort', strength: 5, lastSeen: T0 }, // dû dans 30j
      { itemId: 'moyen', strength: 2, lastSeen: T0 - 4 * DAY }, // dû (3j)
      { itemId: 'faible', strength: 0, lastSeen: T0 - 1 }, // dû direct
      { itemId: 'recent', strength: 3, lastSeen: T0 - 2 * DAY }, // pas dû (7j)
    ]
    expect(dueItems(entries, T0)).toEqual(['faible', 'moyen'])
  })
  it('intervalles croissants', () => {
    expect(INTERVALS_DAYS).toEqual([0, 1, 3, 7, 14, 30])
  })
})
