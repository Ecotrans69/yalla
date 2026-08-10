import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyLessonCompletion,
  computeBadgeStats,
  defaultProfileData,
  emptyState,
  exportProfile,
  importProfile,
  loadState,
  saveState,
  weekXp,
  type AppState,
} from './storage'
import { getCourses } from '../content'
import { parisDay } from '../engine/gamification'

const NOW = Date.UTC(2026, 7, 10, 12, 0, 0) // lundi 10/08/2026 14h Paris

function stateWithProfile(): AppState {
  const s = emptyState()
  s.profiles.push({ id: 'p1', name: 'Sofian', avatar: '🦁', kid: false, createdAt: NOW })
  s.activeProfileId = 'p1'
  s.data.p1 = defaultProfileData(NOW)
  return s
}

beforeEach(() => {
  localStorage.clear()
})

describe('persistance', () => {
  it('état vide au premier lancement', () => {
    expect(loadState().profiles).toEqual([])
  })

  it('save + load round-trip', () => {
    const s = stateWithProfile()
    saveState(s)
    const loaded = loadState()
    expect(loaded.profiles[0].name).toBe('Sofian')
    expect(loaded.activeProfileId).toBe('p1')
  })

  it('JSON corrompu → état neuf sans crash', () => {
    localStorage.setItem('yalla.v1', '{pas du json')
    expect(loadState().profiles).toEqual([])
  })
})

describe('applyLessonCompletion', () => {
  it('ajoute XP du jour Paris, streak, leçon comptée, SRS', () => {
    const s = stateWithProfile()
    const { state, result } = applyLessonCompletion(
      s,
      'p1',
      getCourses(),
      'en',
      'en-u1-l1',
      12,
      0,
      [
        { itemId: 'en_hello', correct: true },
        { itemId: 'en_no', correct: false },
      ],
      NOW
    )
    const d = state.data.p1
    expect(result.xp).toBe(140) // 12*10 + 20 sans faute
    expect(d.xpByDay[parisDay(NOW)]).toBe(140)
    expect(d.streak.count).toBe(1)
    expect(d.lessonsCompleted['en-u1-l1']).toBe(1)
    expect(d.perfectLessons).toBe(1)
    const srs = d.srs.en!
    expect(srs.find((e) => e.itemId === 'en_hello')!.strength).toBe(1)
    expect(srs.find((e) => e.itemId === 'en_no')!.strength).toBe(0)
    expect(result.newBadges).toContain('premiere-lecon')
    expect(result.newBadges).toContain('sans-faute')
  })

  it("ne mute pas l'état d'origine", () => {
    const s = stateWithProfile()
    applyLessonCompletion(s, 'p1', getCourses(), 'en', 'en-u1-l1', 10, 1, [], NOW)
    expect(s.data.p1.lessonsCompleted['en-u1-l1']).toBeUndefined()
  })
})

describe('badges et stats', () => {
  it('computeBadgeStats compte mots et cours', () => {
    const s = stateWithProfile()
    const { state } = applyLessonCompletion(
      s,
      'p1',
      getCourses(),
      'en',
      'en-u1-l1',
      10,
      1,
      [
        { itemId: 'en_hello', correct: true },
        { itemId: 'en_yes', correct: true },
      ],
      NOW
    )
    const stats = computeBadgeStats(state.data.p1, getCourses())
    expect(stats.lessonsDone).toBe(1)
    expect(stats.wordsLearned).toBe(2)
    expect(stats.coursesTouched).toBe(1)
    expect(stats.alphabetDone).toBe(false)
  })
})

describe('weekXp', () => {
  it('additionne depuis lundi', () => {
    const d = defaultProfileData(NOW)
    d.xpByDay['2026-08-10'] = 50 // lundi (jour de NOW)
    d.xpByDay['2026-08-09'] = 30 // dimanche → semaine précédente
    expect(weekXp(d, NOW)).toBe(50)
  })
})

describe('export / import', () => {
  it('round-trip', () => {
    const s = stateWithProfile()
    const json = exportProfile(s, 'p1')
    const restored = importProfile(emptyState(), json)
    expect(restored.profiles[0].name).toBe('Sofian')
    expect(restored.data.p1.dailyGoal).toBe(20)
  })

  it('rejette un fichier invalide avec message FR', () => {
    expect(() => importProfile(emptyState(), '{"foo": 1}')).toThrow(/invalide/)
    expect(() => importProfile(emptyState(), 'garbage')).toThrow(/invalide/)
  })
})
