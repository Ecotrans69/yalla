import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MatchPairs } from './MatchPairs'
import type { Course } from '../../content/types'

const EN: Course = {
  id: 'en',
  title: 'Anglais',
  flag: '🇬🇧',
  ttsLang: 'en-US',
  sttLang: 'en-US',
  units: [],
}

describe('MatchPairs', () => {
  it('reste résoluble quand un mot est identique dans les deux langues', async () => {
    // « bus » se dit bus : l'appariement par TEXTE bloquait la leçon
    const onAnswer = vi.fn()
    const pairs = [
      { a: 'bus', b: 'bus' },
      { a: 'vélo', b: 'bike' },
      { a: 'avion', b: 'plane' },
      { a: 'bateau', b: 'boat' },
    ]
    const user = userEvent.setup()
    render(
      <MatchPairs
        ex={{ type: 'match_pairs', question: 'Associe les paires', pairs }}
        course={EN}
        kid={false}
        onAnswer={onAnswer}
      />
    )

    for (const p of pairs) {
      const boutons = screen.getAllByRole('button')
      const gauche = boutons.filter((b) => b.textContent === p.a && !(b as HTMLButtonElement).disabled)[0]
      await user.click(gauche)
      const restants = screen
        .getAllByRole('button')
        .filter((b) => b.textContent === p.b && !(b as HTMLButtonElement).disabled)
      // pour « bus »/« bus », la colonne de droite est le 2e bouton du même texte
      await user.click(restants[restants.length - 1])
    }

    expect(onAnswer).toHaveBeenCalledWith(true)
  })

  it('une mauvaise association ne valide pas', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(
      <MatchPairs
        ex={{
          type: 'match_pairs',
          question: 'Associe les paires',
          pairs: [
            { a: 'oui', b: 'yes' },
            { a: 'non', b: 'no' },
          ],
        }}
        course={EN}
        kid={false}
        onAnswer={onAnswer}
      />
    )
    await user.click(screen.getByText('oui'))
    await user.click(screen.getByText('no'))
    expect(onAnswer).not.toHaveBeenCalled()
  })
})
