import { describe, it, expect } from 'vitest'
import {
  parisDay,
  lessonXp,
  updateStreak,
  displayStreak,
  currentHearts,
  loseHeart,
  nextHeartIn,
  crownLevel,
  earnedBadges,
  HEART_REGEN_MS,
  MAX_HEARTS,
} from './gamification'

// 2026-08-10 12:00 UTC → 14:00 à Paris (été)
const NOON = Date.UTC(2026, 7, 10, 12, 0, 0)

describe('parisDay', () => {
  it('convertit en jour de Paris', () => {
    expect(parisDay(NOON)).toBe('2026-08-10')
    // 23h30 UTC le 10 = 01h30 à Paris le 11 (été, UTC+2)
    expect(parisDay(Date.UTC(2026, 7, 10, 23, 30))).toBe('2026-08-11')
  })
})

describe('lessonXp', () => {
  it('10 XP par exercice + bonus 20 sans faute', () => {
    expect(lessonXp(12, 0)).toBe(140)
    expect(lessonXp(12, 2)).toBe(120)
  })
})

describe('updateStreak', () => {
  it('premier jour → 1', () => {
    expect(updateStreak(undefined, NOON)).toEqual({ count: 1, lastDay: '2026-08-10' })
  })
  it('même jour → inchangé', () => {
    const s = { count: 3, lastDay: '2026-08-10' }
    expect(updateStreak(s, NOON)).toEqual(s)
  })
  it('hier → +1', () => {
    expect(updateStreak({ count: 3, lastDay: '2026-08-09' }, NOON).count).toBe(4)
  })
  it('série cassée → repart à 1', () => {
    expect(updateStreak({ count: 9, lastDay: '2026-08-07' }, NOON).count).toBe(1)
  })
  it('survit aux changements d’heure (jour de 23 h et de 25 h à Paris)', () => {
    // 25/10/2026 23h30 Paris : le jour précédent dure 25 h
    const finOctobre = Date.UTC(2026, 9, 25, 22, 30)
    expect(parisDay(finOctobre)).toBe('2026-10-25')
    expect(updateStreak({ count: 12, lastDay: '2026-10-24' }, finOctobre).count).toBe(13)
    expect(displayStreak({ count: 12, lastDay: '2026-10-24' }, finOctobre)).toBe(12)
    // 30/03/2026 00h30 Paris : le jour précédent dure 23 h
    const finMars = Date.UTC(2026, 2, 29, 23, 30)
    expect(parisDay(finMars)).toBe('2026-03-30')
    expect(updateStreak({ count: 12, lastDay: '2026-03-29' }, finMars).count).toBe(13)
  })

  it('displayStreak à 0 si cassée', () => {
    expect(displayStreak({ count: 9, lastDay: '2026-08-07' }, NOON)).toBe(0)
    expect(displayStreak({ count: 9, lastDay: '2026-08-09' }, NOON)).toBe(9)
  })
})

describe('cœurs', () => {
  it('régénère 1 cœur toutes les 4h, plafonne à 5', () => {
    const h = { count: 3, updatedAt: NOON }
    expect(currentHearts(h, NOON + 2 * 3_600_000).count).toBe(3)
    expect(currentHearts(h, NOON + HEART_REGEN_MS).count).toBe(4)
    expect(currentHearts(h, NOON + 10 * HEART_REGEN_MS).count).toBe(MAX_HEARTS)
  })
  it('perdre un cœur', () => {
    const h = loseHeart({ count: 5, updatedAt: NOON }, NOON)
    expect(h.count).toBe(4)
    const h2 = loseHeart({ count: 0, updatedAt: NOON }, NOON)
    expect(h2.count).toBe(0)
  })
  it('perd 2 puis récupère 2 après 8h', () => {
    let h = { count: 5, updatedAt: NOON }
    h = loseHeart(h, NOON)
    h = loseHeart(h, NOON)
    expect(h.count).toBe(3)
    expect(currentHearts(h, NOON + 2 * HEART_REGEN_MS).count).toBe(5)
  })
  it('nextHeartIn', () => {
    expect(nextHeartIn({ count: 5, updatedAt: NOON }, NOON)).toBe(0)
    const h = loseHeart({ count: 5, updatedAt: NOON }, NOON)
    expect(nextHeartIn(h, NOON)).toBe(HEART_REGEN_MS)
  })
})

describe('couronnes et badges', () => {
  it('crownLevel plafonne à 5', () => {
    expect(crownLevel(0)).toBe(0)
    expect(crownLevel(3)).toBe(3)
    expect(crownLevel(9)).toBe(5)
  })
  it('earnedBadges seuils exacts', () => {
    expect(
      earnedBadges({
        lessonsDone: 1,
        streak: 7,
        wordsLearned: 100,
        alphabetDone: true,
        perfectLessons: 1,
        totalXp: 1000,
        coursesTouched: 3,
      })
    ).toEqual([
      'premiere-lecon',
      'sans-faute',
      'streak-7',
      'mots-100',
      'alphabet-fini',
      'xp-1000',
      'trois-langues',
    ])
    expect(
      earnedBadges({
        lessonsDone: 0,
        streak: 0,
        wordsLearned: 0,
        alphabetDone: false,
        perfectLessons: 0,
        totalXp: 0,
        coursesTouched: 0,
      })
    ).toEqual([])
  })
})
