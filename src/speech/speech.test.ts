import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mocks des APIs navigateur AVANT l'import des modules
class MockUtterance {
  text: string
  lang = ''
  rate = 1
  voice: unknown = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(text: string) {
    this.text = text
  }
}

const spoken: MockUtterance[] = []
const mockSynthesis = {
  cancel: vi.fn(),
  getVoices: () => [
    { lang: 'fr-FR', name: 'Amelie' },
    { lang: 'en-US', name: 'Samantha' },
    { lang: 'ar-SA', name: 'Majed' },
  ],
  onvoiceschanged: null as (() => void) | null,
  speak: (u: MockUtterance) => {
    spoken.push(u)
    setTimeout(() => u.onend?.(), 0)
  },
}

vi.stubGlobal('speechSynthesis', mockSynthesis)
vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)

const { speak, speakItem, pickVoice, hasVoiceFor, ttsAvailable } = await import('./tts')

describe('tts', () => {
  beforeEach(() => {
    spoken.length = 0
  })

  it('disponible avec le mock', () => {
    expect(ttsAvailable()).toBe(true)
  })

  it('pickVoice trouve la voix arabe', () => {
    expect(pickVoice('ar-SA')?.name).toBe('Majed')
    expect(pickVoice('ar-DZ')?.name).toBe('Majed') // préfixe
    expect(hasVoiceFor('ar')).toBe(true)
    expect(hasVoiceFor('ja')).toBe(false)
  })

  it('speak résout à la fin', async () => {
    await speak('hello', 'en-US')
    expect(spoken[0].text).toBe('hello')
    expect(spoken[0].lang).toBe('en-US')
  })

  it('speakItem darija utilise arScript + ralenti', async () => {
    const course = {
      id: 'dz',
      title: '',
      flag: '',
      ttsLang: 'ar-SA',
      sttLang: 'ar-DZ',
      units: [],
    } as const
    await speakItem({ id: 'x', text: 'salam', fr: 'salut', arScript: 'سلام' }, course, true)
    expect(spoken[0].text).toBe('سلام')
    expect(spoken[0].rate).toBe(0.6)
  })
})

describe('stt', () => {
  it('indisponible sans API', async () => {
    const { sttAvailable, recognize } = await import('./stt')
    expect(sttAvailable()).toBe(false)
    await expect(recognize('en-US')).rejects.toThrow(/non disponible/)
  })

  it('résout avec le transcript du mock', async () => {
    class MockRec {
      lang = ''
      interimResults = true
      maxAlternatives = 1
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: 'hello world' }]] })
        }, 0)
      }
      abort() {
        // rien
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', MockRec)
    vi.resetModules()
    const { recognize, sttAvailable } = await import('./stt')
    expect(sttAvailable()).toBe(true)
    const text = await recognize('en-US')
    expect(text).toBe('hello world')
    vi.unstubAllGlobals()
    vi.stubGlobal('speechSynthesis', mockSynthesis)
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
  })

  it('rejette avec message FR sur refus micro', async () => {
    class MockRecDenied {
      lang = ''
      interimResults = true
      maxAlternatives = 1
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: { error: string }) => void) | null = null
      onend: (() => void) | null = null
      start() {
        setTimeout(() => this.onerror?.({ error: 'not-allowed' }), 0)
      }
      abort() {
        // rien
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', MockRecDenied)
    vi.resetModules()
    const { recognize } = await import('./stt')
    await expect(recognize('ar-SA')).rejects.toThrow(/Micro non autorisé/)
    vi.unstubAllGlobals()
  })
})
