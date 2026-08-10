import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('affiche le titre', () => {
    render(<App />)
    expect(screen.getByText('Yalla!')).toBeInTheDocument()
  })
})
