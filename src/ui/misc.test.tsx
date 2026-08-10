import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import { emptyState, defaultProfileData, saveState, loadState } from '../store/storage'
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
