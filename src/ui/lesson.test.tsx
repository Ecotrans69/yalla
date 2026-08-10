import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Exercise } from '../engine/lessonBuilder'

// Voix coupée dans les tests
vi.mock('../speech/tts', () => ({
  ttsAvailable: () => false,
  speak: () => Promise.resolve(),
  speakItem: () => Promise.resolve(),
  stopSpeaking: () => {},
  hasVoiceFor: () => false,
  pickVoice: () => undefined,
}))
vi.mock('../speech/stt', () => ({
  sttAvailable: () => false,
  recognize: () => Promise.reject(new Error('non dispo')),
  abortRecognition: () => {},
}))

// File d'exercices contrôlée
const HELLO = { id: 'en_hello', text: 'hello', fr: 'bonjour', emoji: '👋' }
const YES = { id: 'en_yes', text: 'yes', fr: 'oui', emoji: '✅' }
const QUEUE: Exercise[] = [
  {
    type: 'select_image',
    item: HELLO,
    question: 'Comment dit-on « bonjour » ?',
    choices: [
      { id: 'en_hello', label: 'hello' },
      { id: 'en_yes', label: 'yes' },
      { id: 'en_no', label: 'no' },
      { id: 'en_goodbye', label: 'goodbye' },
    ],
    correctId: 'en_hello',
  },
  {
    type: 'select_image',
    item: YES,
    question: 'Comment dit-on « oui » ?',
    choices: [
      { id: 'en_hello', label: 'hello' },
      { id: 'en_yes', label: 'yes' },
      { id: 'en_no', label: 'no' },
      { id: 'en_goodbye', label: 'goodbye' },
    ],
    correctId: 'en_yes',
  },
]

vi.mock('../engine/lessonBuilder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../engine/lessonBuilder')>()
  return { ...actual, buildLesson: vi.fn(() => structuredClone(QUEUE)) }
})

import App from '../App'
import { emptyState, defaultProfileData, saveState, loadState } from '../store/storage'

function seedProfile(kid = false) {
  const s = emptyState()
  s.profiles.push({ id: 'p1', name: 'Sofian', avatar: '🦁', kid, createdAt: Date.now() })
  s.activeProfileId = 'p1'
  s.data.p1 = defaultProfileData(Date.now())
  saveState(s)
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = '#/lecon/en/en-u1-l1'
})

describe('LessonScreen', () => {
  it('leçon complète sans faute → écran de fin avec XP et 100 %', async () => {
    seedProfile()
    const user = userEvent.setup()
    render(<App />)

    // Exercice 1 : bonne réponse
    await user.click(await screen.findByText('hello'))
    await user.click(screen.getByText('Vérifier'))
    expect(await screen.findByText(/Bien joué/)).toBeInTheDocument()
    await user.click(screen.getByText('Continuer'))

    // Exercice 2 : bonne réponse
    await user.click(await screen.findByText('yes'))
    await user.click(screen.getByText('Vérifier'))
    await user.click(await screen.findByText('Continuer'))

    // Fin
    expect(await screen.findByText(/Leçon terminée/)).toBeInTheDocument()
    expect(screen.getByText('+40')).toBeInTheDocument() // 2×10 + 20 sans faute
    expect(screen.getByText('100%')).toBeInTheDocument()

    const saved = loadState()
    expect(saved.data.p1.lessonsCompleted['en-u1-l1']).toBe(1)
    expect(saved.data.p1.hearts.count).toBe(5)
  })

  it('mauvaise réponse → correction affichée, cœur perdu, exercice repassé', async () => {
    seedProfile()
    const user = userEvent.setup()
    render(<App />)

    // Ex 1 : on se trompe volontairement
    await user.click(await screen.findByText('no'))
    await user.click(screen.getByText('Vérifier'))
    expect(await screen.findByText(/Pas tout à fait/)).toBeInTheDocument()
    expect(screen.getByText(/La bonne réponse/)).toBeInTheDocument()
    await user.click(screen.getByText('Continuer'))

    // Ex 2 : correct
    await user.click(await screen.findByText('yes'))
    await user.click(screen.getByText('Vérifier'))
    await user.click(await screen.findByText('Continuer'))

    // Ex 1 repassé en fin de file : correct cette fois
    await user.click(await screen.findByText('hello'))
    await user.click(screen.getByText('Vérifier'))
    await user.click(await screen.findByText('Continuer'))

    expect(await screen.findByText(/Leçon terminée/)).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument() // 2 exercices, 1 faute

    const saved = loadState()
    expect(saved.data.p1.hearts.count).toBe(4) // un cœur perdu
    // le premier essai raté compte pour le SRS
    expect(saved.data.p1.srs.en!.find((e) => e.itemId === 'en_hello')!.strength).toBe(0)
    expect(saved.data.p1.srs.en!.find((e) => e.itemId === 'en_yes')!.strength).toBe(1)
  })

  it('profil enfant : pas de perte de cœur', async () => {
    seedProfile(true)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByText('no'))
    await user.click(screen.getByText('Vérifier'))
    await user.click(await screen.findByText('Continuer'))

    const saved = loadState()
    expect(saved.data.p1.hearts.count).toBe(5)
  })

  it('révision sans items dus → message bravo', async () => {
    seedProfile()
    window.location.hash = '#/revision/en'
    render(<App />)
    expect(await screen.findByText(/Rien à réviser/)).toBeInTheDocument()
  })
})
