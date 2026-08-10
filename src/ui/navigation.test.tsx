import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'
import { emptyState, defaultProfileData, saveState } from '../store/storage'

function seedProfile(kid = false) {
  const s = emptyState()
  s.profiles.push({ id: 'p1', name: 'Sofian', avatar: '🦁', kid, createdAt: Date.now() })
  s.activeProfileId = 'p1'
  s.data.p1 = defaultProfileData(Date.now())
  saveState(s)
}

beforeEach(() => {
  localStorage.clear()
  window.location.hash = ''
})

describe('navigation', () => {
  it("sans profil : écran de création à l'ouverture", () => {
    render(<App />)
    expect(screen.getByText('Yalla!')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Prénom')).toBeInTheDocument()
  })

  it('création de profil → accueil avec le prénom', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByPlaceholderText('Prénom'), 'Lina')
    await user.click(screen.getByText("C'est parti !"))
    expect(await screen.findByText(/Salut Lina/)).toBeInTheDocument()
    expect(screen.getByText(/Objectif du jour/)).toBeInTheDocument()
  })

  it('accueil : les 3 cours sont listés', () => {
    seedProfile()
    render(<App />)
    expect(screen.getByText('Anglais')).toBeInTheDocument()
    expect(screen.getByText('Arabe littéraire')).toBeInTheDocument()
    expect(screen.getByText('Darija algérienne')).toBeInTheDocument()
  })

  it('ouvre le parcours anglais, leçons suivantes verrouillées', async () => {
    seedProfile()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('Anglais'))
    expect(await screen.findByText(/Salutations/)).toBeInTheDocument()
    const locked = screen.getAllByText('🔒')
    expect(locked.length).toBeGreaterThan(0)
  })
})
