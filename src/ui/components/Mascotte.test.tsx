import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Mascotte, type MascotteHumeur } from './Mascotte'

const HUMEURS: MascotteHumeur[] = ['neutre', 'content', 'triste', 'fete', 'dodo', 'curieux']

/** Le dessin du personnage, sans le CSS ni la bulle. */
function svgDe(container: HTMLElement) {
  return container.querySelector('svg')!
}

/** Le CSS que le composant embarque avec lui. */
function cssDe(container: HTMLElement) {
  return container.querySelector('style')!.textContent!
}

/**
 * Les classes `fenek-…` réellement posées sur le dessin d'une humeur.
 * On lit l'attribut : sur un élément SVG, `className` n'est pas une chaîne.
 */
function classesDe(humeur: MascotteHumeur) {
  const { container, unmount } = render(<Mascotte humeur={humeur} />)
  const vues = new Set<string>()
  container.querySelectorAll('[class]').forEach((el) => {
    for (const c of (el.getAttribute('class') ?? '').split(/\s+/)) {
      if (c.startsWith('fenek-')) vues.add(c)
    }
  })
  unmount()
  return [...vues]
}

describe('Mascotte — rendu', () => {
  it('affiche Fenek pour chacune des humeurs', () => {
    for (const humeur of HUMEURS) {
      const { container, unmount } = render(<Mascotte humeur={humeur} />)
      const svg = svgDe(container)
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('role', 'img')
      // le dessin doit vraiment contenir des tracés, pas une coquille vide
      expect(svg.querySelectorAll('path, ellipse, circle').length).toBeGreaterThan(10)
      unmount()
    }
  })

  it("s'affiche sans humeur précisée (par défaut : neutre)", () => {
    render(<Mascotte />)
    expect(screen.getByRole('img', { name: 'Fenek le fennec' })).toBeInTheDocument()
  })

  it('accepte une classe supplémentaire sans perdre la sienne', () => {
    const { container } = render(<Mascotte className="ma-classe" />)
    const racine = container.firstElementChild!
    expect(racine).toHaveClass('fenek')
    expect(racine).toHaveClass('ma-classe')
  })
})

describe('Mascotte — accessibilité', () => {
  it("décrit l'humeur en français dans l'aria-label", () => {
    const attendus: Record<MascotteHumeur, RegExp> = {
      neutre: /^Fenek le fennec$/,
      content: /content/,
      triste: /triste/,
      fete: /fête/,
      dodo: /dort/,
      curieux: /curieux/,
    }
    for (const humeur of HUMEURS) {
      const { container, unmount } = render(<Mascotte humeur={humeur} />)
      const label = svgDe(container).getAttribute('aria-label')!
      expect(label).toMatch(/^Fenek le fennec/)
      expect(label).toMatch(attendus[humeur])
      unmount()
    }
  })

  it('donne un aria-label différent à chaque humeur', () => {
    const labels = HUMEURS.map((humeur) => {
      const { container, unmount } = render(<Mascotte humeur={humeur} />)
      const label = svgDe(container).getAttribute('aria-label')!
      unmount()
      return label
    })
    expect(new Set(labels).size).toBe(HUMEURS.length)
  })

  it('coupe toutes les animations si le système demande moins de mouvement', () => {
    const { container } = render(<Mascotte />)
    const css = cssDe(container)
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    // toutes les classes animées doivent être neutralisées dans ce bloc
    const bloc = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    for (const classe of ['fenek-balance', 'fenek-cligne', 'fenek-zzz']) {
      expect(bloc).toContain(classe)
    }
    expect(bloc).toContain('animation: none')
  })

  it('neutralise des animations qui existent pour de vrai', () => {
    // le test précédent ne lit que du texte CSS : il resterait vert même si
    // plus aucun élément ne portait ces classes. On vérifie donc qu'elles sont
    // bien posées sur le dessin, sinon la promesse « animations coupées » ne
    // protège que des classes fantômes.
    for (const humeur of HUMEURS) {
      expect(classesDe(humeur)).toContain('fenek-balance')
    }
    expect(classesDe('dodo')).toContain('fenek-zzz')
  })

  it('ne fait cligner que les yeux ouverts', () => {
    for (const humeur of ['neutre', 'content', 'triste', 'curieux'] as MascotteHumeur[]) {
      expect(classesDe(humeur)).toContain('fenek-cligne')
    }
    // fête et dodo ont déjà les yeux fermés : les faire cligner les ferait
    // clignoter dans le vide
    expect(classesDe('fete')).not.toContain('fenek-cligne')
    expect(classesDe('dodo')).not.toContain('fenek-cligne')
  })
})

describe('Mascotte — thème clair et sombre', () => {
  it('habille la bulle avec les variables du thème', () => {
    const { container } = render(<Mascotte bulle="Salut" />)
    const css = cssDe(container)
    const regle = css.slice(css.indexOf('.fenek-bulle {'), css.indexOf('.fenek-bulle::before'))
    expect(regle).toContain('background: var(--card)')
    expect(regle).toContain('color: var(--text)')
    expect(regle).toContain('var(--border)')
  })

  it("n'écrit aucune couleur figée hors de la robe du personnage", () => {
    const { container } = render(<Mascotte bulle="Salut" />)
    // Fenek garde le même pelage en clair comme en sombre : les seules couleurs
    // en dur autorisées sont ses variables --fenek-…. Tout le reste (fonds,
    // textes, bordures, flèche de la bulle) doit suivre le thème.
    const horsPalette = cssDe(container).replace(/--fenek-[\w-]+:\s*#[0-9a-fA-F]{3,8};/g, '')
    expect(horsPalette).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('fait suivre le thème aux accessoires et à la larme', () => {
    const tokens = (humeur: MascotteHumeur) => {
      const { container, unmount } = render(<Mascotte humeur={humeur} />)
      const vus = [...container.querySelectorAll('[fill]')]
        .map((el) => el.getAttribute('fill')!)
        // on ignore la robe (--fenek-…), qui ne change pas avec le thème
        .filter((f) => /^var\(--(?!fenek-)/.test(f))
      unmount()
      return vus
    }
    expect(tokens('triste')).toEqual(['var(--blue)'])
    expect(tokens('fete').length).toBeGreaterThanOrEqual(4)
    expect(tokens('neutre')).toEqual([])

    // « zzz » et « ? » n'ont pas de couleur à eux : ils prennent celle du texte
    const { container } = render(<Mascotte humeur="dodo" />)
    expect(container.querySelector('.fenek-zzz')!.getAttribute('fill')).toBe('currentColor')
    expect(cssDe(container)).toContain('color: var(--text)')
  })
})

describe('Mascotte — bulle', () => {
  it('affiche le texte donné', () => {
    render(<Mascotte humeur="content" bulle="Bravo ! Tu as gagné 10 points." />)
    expect(screen.getByText('Bravo ! Tu as gagné 10 points.')).toBeInTheDocument()
  })

  it('reste lisible par un lecteur d’écran (jamais aria-hidden)', () => {
    render(<Mascotte bulle="Yalla, on continue !" />)
    const bulle = screen.getByText('Yalla, on continue !')
    expect(bulle.closest('[aria-hidden="true"]')).toBeNull()
    // le texte vit dans le DOM, pas dans le SVG décoratif
    expect(bulle.closest('svg')).toBeNull()
  })

  it("n'affiche aucune bulle quand il n'y a rien à dire", () => {
    const { container } = render(<Mascotte />)
    expect(container.querySelector('.fenek-bulle')).toBeNull()
  })
})

describe('Mascotte — taille', () => {
  it('utilise la largeur demandée', () => {
    const { container } = render(<Mascotte taille={48} />)
    expect(svgDe(container)).toHaveAttribute('width', '48')
  })

  it('mesure 120 px de large par défaut', () => {
    const { container } = render(<Mascotte />)
    expect(svgDe(container)).toHaveAttribute('width', '120')
  })

  it('garde les proportions du dessin à toutes les tailles', () => {
    for (const taille of [48, 120, 160, 240]) {
      const { container, unmount } = render(<Mascotte taille={taille} />)
      const svg = svgDe(container)
      const [, , vbL, vbH] = svg.getAttribute('viewBox')!.split(/\s+/).map(Number)
      const largeur = Number(svg.getAttribute('width'))
      const hauteur = Number(svg.getAttribute('height'))
      expect(largeur).toBe(taille)
      // l'arrondi au pixel près ne doit pas déformer Fenek
      expect(Math.abs(hauteur / largeur - vbH / vbL)).toBeLessThan(0.01)
      unmount()
    }
  })
})

describe('Mascotte — le personnage reste le même', () => {
  it("change le visage et la posture d'une humeur à l'autre", () => {
    const { container: neutre } = render(<Mascotte humeur="neutre" />)
    const { container: triste } = render(<Mascotte humeur="triste" />)
    expect(svgDe(neutre).innerHTML).not.toBe(svgDe(triste).innerHTML)
  })

  it('garde exactement la même silhouette (queue, corps, pattes)', () => {
    // seul le visage et les oreilles réagissent à l'humeur : le corps doit être
    // au tracé près le même, sinon ce n'est plus le même personnage
    const silhouettes = HUMEURS.map((humeur) => {
      const { container, unmount } = render(<Mascotte humeur={humeur} />)
      const corps = container.querySelector('.fenek-silhouette')!
      const html = corps.innerHTML
      unmount()
      return html
    })
    expect(silhouettes[0]).toBeTruthy()
    expect(new Set(silhouettes).size).toBe(1)
  })

  it('bouge les oreilles selon l’humeur (lisible même en tout petit)', () => {
    const rotations = HUMEURS.map((humeur) => {
      const { container, unmount } = render(<Mascotte humeur={humeur} />)
      const groupes = [...svgDe(container).querySelectorAll('g[transform^="rotate"]')]
      const t = groupes.map((g) => g.getAttribute('transform')).join('|')
      unmount()
      return t
    })
    // une posture d'oreilles propre à chaque humeur, aucune n'est figée
    expect(new Set(rotations).size).toBe(HUMEURS.length)
  })
})
