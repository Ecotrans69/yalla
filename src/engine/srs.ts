/** Répétition espacée type Leitner */

export interface SrsEntry {
  itemId: string
  /** Force de mémorisation 0 (inconnu) → 5 (acquis) */
  strength: number
  /** Timestamp de la dernière rencontre */
  lastSeen: number
}

export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30]
const DAY_MS = 86_400_000

/** Met à jour (ou crée) l'entrée SRS d'un item après une réponse */
export function onResult(
  e: SrsEntry | undefined,
  itemId: string,
  correct: boolean,
  now: number
): SrsEntry {
  if (!e) return { itemId, strength: correct ? 1 : 0, lastSeen: now }
  const strength = correct ? Math.min(5, e.strength + 1) : Math.max(0, e.strength - 2)
  return { itemId, strength, lastSeen: now }
}

/** Items dus pour révision, les plus faibles d'abord */
export function dueItems(entries: SrsEntry[], now: number): string[] {
  return entries
    .filter((e) => e.lastSeen + INTERVALS_DAYS[e.strength] * DAY_MS <= now)
    .sort((a, b) => a.strength - b.strength || a.lastSeen - b.lastSeen)
    .map((e) => e.itemId)
}
