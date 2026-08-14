import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Course } from '../content/types'

vi.mock('./tts', () => ({
  speakItem: vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
}))

import { pickVariant, audioUrl, playItem, effectiveRate } from './audio'
import { speakItem } from './tts'

const EN = { id: 'en', title: '', flag: '', ttsLang: 'en-US', sttLang: 'en-US', units: [] } as Course
const AR = { id: 'ar', title: '', flag: '', ttsLang: 'ar-SA', sttLang: 'ar-SA', units: [] } as Course

describe('pickVariant', () => {
  it('mélange anglais : homme/femme/enfant selon le tirage', () => {
    expect(pickVariant(EN, 'mix', () => 0)).toBe('h')
    expect(pickVariant(EN, 'mix', () => 0.5)).toBe('f')
    expect(pickVariant(EN, 'mix', () => 0.99)).toBe('e')
  })
  it('mélange arabe : jamais enfant', () => {
    expect(pickVariant(AR, 'mix', () => 0.99)).toBe('f')
  })
  it("choix enfant sur l'arabe → femme", () => {
    expect(pickVariant(AR, 'e')).toBe('f')
  })
  it('choix fixe respecté', () => {
    expect(pickVariant(EN, 'h')).toBe('h')
    expect(pickVariant(AR, 'f')).toBe('f')
  })
})

describe('effectiveRate', () => {
  it('normal = réglage tel quel', () => {
    expect(effectiveRate(1, false)).toBe(1)
    expect(effectiveRate(0.85, false)).toBe(0.85)
  })
  it('tortue = réglage × 0.7, plancher 0.5', () => {
    expect(effectiveRate(1, true)).toBeCloseTo(0.7)
    expect(effectiveRate(0.7, true)).toBeCloseTo(0.5)
    expect(effectiveRate(1.15, true)).toBeCloseTo(0.81)
  })
})

describe('audioUrl', () => {
  it('construit le chemin du mp3', () => {
    expect(audioUrl('en_hello', 'h')).toMatch(/audio\/en_hello\.h\.mp3$/)
  })
})

describe('playItem', () => {
  beforeEach(() => {
    vi.mocked(speakItem).mockClear()
  })

  it("résout à la fin de l'audio", async () => {
    class OkAudio {
      src: string
      playbackRate = 1
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(src: string) {
        this.src = src
      }
      play() {
        setTimeout(() => this.onended?.(), 0)
        return Promise.resolve()
      }
      pause() {
        // rien
      }
    }
    vi.stubGlobal('Audio', OkAudio)
    await playItem({ id: 'en_hello', text: 'hello', fr: 'bonjour' }, EN, false, 'h')
    expect(speakItem).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('double-tap : l’audio supersédé ne repart JAMAIS en voix du téléphone', async () => {
    // play() reste en attente puis rejette (AbortError) quand pause() arrive
    const rejets: ((e: Error) => void)[] = []
    class PendingAudio {
      src = ''
      playbackRate = 1
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      play() {
        return new Promise<void>((_, reject) => rejets.push(reject))
      }
      pause() {
        // le navigateur rejette le play() en attente : on laisse le test le déclencher
      }
    }
    vi.stubGlobal('Audio', PendingAudio)
    const item = { id: 'en_hello', text: 'hello', fr: 'bonjour' }
    const premier = playItem(item, EN, false, 'h')
    const second = playItem(item, EN, false, 'f') // stopAudio() interne → supersède le 1er
    // le play() du 1er rejette après coup
    rejets[0]?.(new Error('AbortError'))
    await premier
    expect(speakItem).not.toHaveBeenCalled()
    // le 2e reste maître : son propre échec, lui, a le droit de basculer
    rejets[1]?.(new Error('404'))
    await second
    expect(speakItem).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('fichier introuvable → fallback voix du téléphone', async () => {
    class FailAudio {
      src = ''
      playbackRate = 1
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      play() {
        return Promise.reject(new Error('404'))
      }
      pause() {
        // rien
      }
    }
    vi.stubGlobal('Audio', FailAudio)
    await playItem({ id: 'en_hello', text: 'hello', fr: 'bonjour' }, EN, true, 'f')
    expect(speakItem).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })
})
