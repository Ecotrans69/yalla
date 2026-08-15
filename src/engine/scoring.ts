import type { CourseId, VocabItem } from '../content/types'
import { normalize, translitArToLatin } from './normalize'

/**
 * Distance de Damerau-Levenshtein : comme Levenshtein, mais l'INVERSION de
 * deux lettres coûte 1 et non 2 — c'est la faute de frappe la plus fréquente
 * au clavier tactile (« tabel » pour « table »).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prevPrev: number[] = []
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], prevPrev[j - 2] + 1)
      }
    }
    prevPrev = prev
    prev = curr.slice()
  }
  return prev[b.length]
}

/** Similarité 0..1 entre deux chaînes DÉJÀ normalisées */
export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1
  const max = Math.max(a.length, b.length)
  return 1 - levenshtein(a, b) / max
}

/** Vérifie une réponse tapée au clavier (tolérance faute de frappe légère) */
export function checkTyped(
  answer: string,
  expected: string,
  lang: CourseId | 'fr'
): { ok: boolean; score: number } {
  const na = normalize(answer, lang)
  const nb = normalize(expected, lang)
  const lev = levenshtein(na, nb)
  const max = Math.max(na.length, nb.length)
  const score = max === 0 ? 1 : 1 - lev / max
  // une seule faute de frappe est tolérée dès 4 lettres : sinon aucun mot
  // court n'en pardonnait une, alors qu'une longue phrase en pardonnait deux
  return { ok: score >= 0.85 || (lev <= 1 && nb.length >= 4), score }
}

/**
 * Vérifie une phrase reconnue au micro contre l'item attendu.
 * - en : comparaison directe
 * - ar : compare côté écriture arabe ET côté phonétique, garde le meilleur
 * - dz : le moteur de reco renvoie souvent de l'écriture arabe → on compare
 *   la translittération ET le latin direct ET l'arScript, on garde le meilleur
 * Seuils : 0.7 adulte, 0.55 enfant, 0.55 darija (toujours, tolérance dialecte)
 */
export function checkSpoken(
  recognized: string,
  item: VocabItem,
  course: CourseId,
  kid: boolean
): { ok: boolean; score: number } {
  let score = 0
  if (course === 'en') {
    score = similarity(normalize(recognized, 'en'), normalize(item.text, 'en'))
  } else if (course === 'ar') {
    const viaScript = similarity(normalize(recognized, 'ar'), normalize(item.text, 'ar'))
    const viaPhon = item.phon
      ? similarity(translitArToLatin(recognized), normalize(item.phon, 'fr'))
      : 0
    // lettres de l'alphabet : accepter aussi le NOM de la lettre (« baa » pour ب)
    const viaName = item.arScript
      ? similarity(normalize(recognized, 'ar'), normalize(item.arScript, 'ar'))
      : 0
    score = Math.max(viaScript, viaPhon, viaName)
  } else {
    const viaTranslit = similarity(translitArToLatin(recognized), normalize(item.text, 'fr'))
    const direct = similarity(normalize(recognized, 'fr'), normalize(item.text, 'fr'))
    const viaScript = item.arScript
      ? similarity(normalize(recognized, 'ar'), normalize(item.arScript, 'ar'))
      : 0
    score = Math.max(viaTranslit, direct, viaScript)
  }
  const threshold = course === 'dz' ? 0.55 : kid ? 0.55 : 0.7
  return { ok: score >= threshold, score }
}
