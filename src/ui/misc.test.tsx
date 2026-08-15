import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import { emptyState, defaultProfileData, saveState, loadState } from '../store/storage'
import { vi } from 'vitest'

vi.mock('../speech/audio', () => ({
  playItem: () => Promise.resolve(),
  stopAudio: () => {},
  effectiveRate: (r: number) => r,
  pickVariant: () => 'h',
  audioUrl: (id: string) => `/audio/${id}.h.mp3`,
  VOICE_LABELS: [
    ['mix', '🔀 Mélange'],
    ['h', '🧔 Homme'],
  ],
}))
import { parisDay } from '../engine/gamification'

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
})

function seedFamily() {
  const s = emptyState()
  const now = Date.now()
  s.profiles.push({ id: 'p1', name: 'Sofian', avatar: '🦁', kid: false, createdAt: now })
  s.profiles.push({ id: 'p2', name: 'Lina', avatar: '🦄', kid: true, createdAt: now })
  s.activeProfileId = 'p1'
  s.data.p1 = defaultProfileData(now)
  s.data.p2 = defaultProfileData(now)
  s.data.p1.xpByDay[parisDay(now)] = 30
  s.data.p2.xpByDay[parisDay(now)] = 120
  saveState(s)
}

describe('classement famille', () => {
  it('trie par XP de la semaine', async () => {
    seedFamily()
    window.location.hash = '#/classement'
    render(<App />)
    expect(await screen.findByText(/Classement de la semaine/)).toBeInTheDocument()
    const gold = screen.getByText('🥇')
    // Lina (120 XP) doit être première
    expect(gold.parentElement!.textContent).toContain('Lina')
    expect(screen.getByText(/Sofian/).textContent).toContain('(toi)')
  })
})

describe('leçon verrouillée', () => {
  it('explique quoi terminer d’abord au lieu de ne rien faire', async () => {
    seedFamily()
    window.location.hash = '#/cours/en'
    const user = userEvent.setup()
    render(<App />)
    const verrouillees = await screen.findAllByText('🔒')
    await user.click(verrouillees[0])
    expect(await screen.findByText(/Pas encore ouverte/)).toBeInTheDocument()
    expect(screen.getByText(/Termine d'abord/)).toBeInTheDocument()
  })
})

describe('profil enfant', () => {
  it('ne voit ni import ni gestion des profils dans les réglages', async () => {
    seedFamily()
    // on bascule sur le profil enfant (p2 = Lina)
    const s = loadState()
    s.activeProfileId = 'p2'
    saveState(s)
    window.location.hash = '#/reglages'
    render(<App />)
    expect(await screen.findByText(/Objectif quotidien/)).toBeInTheDocument()
    expect(screen.queryByText(/Importer une sauvegarde/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Gérer les profils/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Changer de profil/)).not.toBeInTheDocument()
  })
})

describe('restauration', () => {
  it('est accessible depuis l’écran des profils (téléphone neuf)', async () => {
    render(<App />)
    expect(await screen.findByText(/Restaurer une sauvegarde/)).toBeInTheDocument()
  })
})

describe('réglages', () => {
  it("changer l'objectif quotidien persiste", async () => {
    seedFamily()
    window.location.hash = '#/reglages'
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText('30 XP'))
    expect(loadState().data.p1.dailyGoal).toBe(30)
  })

  it('changer de profil ramène à la liste', async () => {
    seedFamily()
    window.location.hash = '#/reglages'
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByText(/Changer de profil/))
    expect(await screen.findByText('Qui joue ?')).toBeInTheDocument()
  })
})
