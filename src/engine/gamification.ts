/** XP, streak (heure de France), cœurs, couronnes, badges */

const DAY_MS = 86_400_000

/** Jour 'YYYY-MM-DD' en Europe/Paris */
export function parisDay(now: number): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now))
}

/** XP d'une leçon : 10 par exercice + 20 de bonus si zéro faute */
export function lessonXp(exCount: number, mistakes: number): number {
  return exCount * 10 + (mistakes === 0 ? 20 : 0)
}

export interface Streak {
  count: number
  lastDay: string
}

export function updateStreak(s: Streak | undefined, now: number): Streak {
  const today = parisDay(now)
  if (!s || !s.count) return { count: 1, lastDay: today }
  if (s.lastDay === today) return s
  const yesterday = parisDay(now - DAY_MS)
  return { count: s.lastDay === yesterday ? s.count + 1 : 1, lastDay: today }
}

/** Streak affiché : 0 si la série est cassée (dernier jour ni aujourd'hui ni hier) */
export function displayStreak(s: Streak | undefined, now: number): number {
  if (!s) return 0
  const today = parisDay(now)
  const yesterday = parisDay(now - DAY_MS)
  return s.lastDay === today || s.lastDay === yesterday ? s.count : 0
}

export interface Hearts {
  count: number
  updatedAt: number
}

export const HEART_REGEN_MS = 4 * 3_600_000
export const MAX_HEARTS = 5

/** Applique la régénération accumulée (1 cœur / 4 h, plafond 5) */
export function currentHearts(h: Hearts, now: number): Hearts {
  if (h.count >= MAX_HEARTS) return { count: MAX_HEARTS, updatedAt: now }
  const gained = Math.floor((now - h.updatedAt) / HEART_REGEN_MS)
  if (gained <= 0) return h
  const count = Math.min(MAX_HEARTS, h.count + gained)
  return {
    count,
    updatedAt: count >= MAX_HEARTS ? now : h.updatedAt + gained * HEART_REGEN_MS,
  }
}

export function loseHeart(h: Hearts, now: number): Hearts {
  const cur = currentHearts(h, now)
  return {
    count: Math.max(0, cur.count - 1),
    updatedAt: cur.count >= MAX_HEARTS ? now : cur.updatedAt,
  }
}

/** Millisecondes avant le prochain cœur (0 si plein) */
export function nextHeartIn(h: Hearts, now: number): number {
  const cur = currentHearts(h, now)
  if (cur.count >= MAX_HEARTS) return 0
  return Math.max(0, cur.updatedAt + HEART_REGEN_MS - now)
}

/** Couronnes d'une unité : nombre de fois complétée, plafonné à 5 */
export function crownLevel(timesCompleted: number): number {
  return Math.min(5, timesCompleted)
}

export interface BadgeDef {
  id: string
  emoji: string
  title: string
  desc: string
}

export const BADGES: BadgeDef[] = [
  { id: 'premiere-lecon', emoji: '🐣', title: 'Premier pas', desc: 'Terminer sa première leçon' },
  { id: 'sans-faute', emoji: '🎯', title: 'Sans faute', desc: 'Une leçon parfaite, zéro erreur' },
  { id: 'streak-7', emoji: '🔥', title: 'Une semaine !', desc: '7 jours de suite' },
  { id: 'streak-30', emoji: '🌋', title: 'Un mois !', desc: '30 jours de suite' },
  { id: 'mots-100', emoji: '📚', title: '100 mots', desc: 'Apprendre 100 mots' },
  { id: 'alphabet-fini', emoji: '✍️', title: 'Calligraphe', desc: "Finir l'alphabet arabe" },
  { id: 'xp-1000', emoji: '⚡', title: '1000 XP', desc: 'Atteindre 1000 XP' },
  { id: 'trois-langues', emoji: '🌍', title: 'Polyglotte', desc: 'Étudier les 3 langues' },
]

export interface BadgeStats {
  lessonsDone: number
  streak: number
  wordsLearned: number
  alphabetDone: boolean
  perfectLessons: number
  totalXp: number
  coursesTouched: number
}

export function earnedBadges(stats: BadgeStats): string[] {
  const out: string[] = []
  if (stats.lessonsDone >= 1) out.push('premiere-lecon')
  if (stats.perfectLessons >= 1) out.push('sans-faute')
  if (stats.streak >= 7) out.push('streak-7')
  if (stats.streak >= 30) out.push('streak-30')
  if (stats.wordsLearned >= 100) out.push('mots-100')
  if (stats.alphabetDone) out.push('alphabet-fini')
  if (stats.totalXp >= 1000) out.push('xp-1000')
  if (stats.coursesTouched >= 3) out.push('trois-langues')
  return out
}
