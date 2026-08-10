import type { CourseId } from '../content/types'

/** Ponctuation latine + arabe */
const PUNCT = /[.,!?;:'"«»()\-…؟،؛٬٫]/g

/**
 * Normalise une chaîne pour comparaison : minuscules, sans ponctuation,
 * espaces simples. Pour l'arabe : sans diacritiques ni tatweel,
 * variantes d'alif unifiées, ta marbuta → ha, alif maqsura → ya.
 */
export function normalize(s: string, lang: CourseId | 'fr'): string {
  let out = s.toLowerCase().trim()
  if (lang === 'ar') {
    out = out
      .replace(/[ً-ْٰ]/g, '') // fatha, kasra, damma, sukun, chadda…
      .replace(/ـ/g, '') // tatweel ـ
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
  }
  out = out.replace(PUNCT, ' ')
  return out.replace(/\s+/g, ' ').trim()
}

const AR_TO_LATIN: Record<string, string> = {
  ا: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'ch',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'dh',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'ou',
  ي: 'i',
  ء: '',
  ئ: '',
  ؤ: '',
}

/**
 * Translittération grossière arabe → latin (pour comparer une reconnaissance
 * vocale en écriture arabe avec une phonétique darija en lettres latines).
 */
export function translitArToLatin(s: string): string {
  const n = normalize(s, 'ar')
  let out = ''
  for (const ch of n) {
    if (ch === ' ') out += ' '
    else out += AR_TO_LATIN[ch] ?? ''
  }
  return out.replace(/\s+/g, ' ').trim()
}
