import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom n'implémente ni le défilement ni matchMedia : on les neutralise
// (comportement navigateur réel vérifié à la main dans le Browser pane)
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
Element.prototype.scrollIntoView = vi.fn()
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}
