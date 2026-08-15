import type { Course, CourseId } from '../content/types'
import type { VoiceChoice } from '../speech/audio'
import { onResult, type SrsEntry } from '../engine/srs'
import {
  earnedBadges,
  lessonXp,
  parisDay,
  updateStreak,
  type BadgeStats,
  type Hearts,
  type Streak,
} from '../engine/gamification'

export interface Profile {
  id: string
  name: string
  avatar: string
  kid: boolean
  createdAt: number
}

export interface ProfileData {
  xpByDay: Record<string, number>
  streak: Streak
  hearts: Hearts
  dailyGoal: number
  srs: Partial<Record<CourseId, SrsEntry[]>>
  /** lessonId → nombre de fois complétée */
  lessonsCompleted: Record<string, number>
  badges: string[]
  perfectLessons: number
  theme?: 'light' | 'dark'
  /** Voix préférée pour les audios (h/f/e/mix) */
  voice?: VoiceChoice
  /** Vitesse de lecture des audios (0.7 à 1.15, défaut 1) */
  rate?: number
}

export interface AppState {
  version: 1
  profiles: Profile[]
  activeProfileId?: string
  data: Record<string, ProfileData>
}

const KEY = 'yalla.v1'

export function defaultProfileData(now: number): ProfileData {
  return {
    xpByDay: {},
    streak: { count: 0, lastDay: '' },
    hearts: { count: 5, updatedAt: now },
    dailyGoal: 20,
    srs: {},
    lessonsCompleted: {},
    badges: [],
    perfectLessons: 0,
  }
}

export function emptyState(): AppState {
  return { version: 1, profiles: [], data: {} }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as AppState
    if (parsed?.version !== 1 || !Array.isArray(parsed.profiles)) return emptyState()
    return parsed
  } catch {
    return emptyState()
  }
}

export function saveState(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // stockage plein ou indisponible : on continue sans bloquer l'app
  }
}

export function computeBadgeStats(data: ProfileData, courses: Course[]): BadgeStats {
  const lessonsDone = Object.values(data.lessonsCompleted).reduce((a, b) => a + b, 0)
  const allSrs = Object.values(data.srs).flatMap((e) => e ?? [])
  const wordsLearned = allSrs.filter((e) => e.strength >= 1).length
  const ar = courses.find((c) => c.id === 'ar')
  const letterLessons =
    ar?.units.flatMap((u) => u.lessons.filter((l) => l.kind === 'letters')) ?? []
  const alphabetDone =
    letterLessons.length > 0 && letterLessons.every((l) => (data.lessonsCompleted[l.id] ?? 0) >= 1)
  const totalXp = Object.values(data.xpByDay).reduce((a, b) => a + b, 0)
  const coursesTouched = courses.filter((c) =>
    c.units.some((u) => u.lessons.some((l) => (data.lessonsCompleted[l.id] ?? 0) >= 1))
  ).length
  return {
    lessonsDone,
    streak: data.streak.count,
    wordsLearned,
    alphabetDone,
    perfectLessons: data.perfectLessons,
    totalXp,
    coursesTouched,
  }
}

export interface LessonResult {
  xp: number
  newBadges: string[]
}

/** Applique la fin d'une leçon (pur : retourne le nouvel état) */
export function applyLessonCompletion(
  state: AppState,
  profileId: string,
  courses: Course[],
  courseId: CourseId,
  lessonId: string,
  exCount: number,
  mistakes: number,
  itemResults: { itemId: string; correct: boolean }[],
  now: number
): { state: AppState; result: LessonResult } {
  const prev = state.data[profileId] ?? defaultProfileData(now)
  const data: ProfileData = structuredClone(prev)

  const xp = lessonXp(exCount, mistakes)
  const day = parisDay(now)
  data.xpByDay[day] = (data.xpByDay[day] ?? 0) + xp
  data.streak = updateStreak(data.streak, now)
  data.lessonsCompleted[lessonId] = (data.lessonsCompleted[lessonId] ?? 0) + 1
  if (mistakes === 0) data.perfectLessons += 1

  const entries = (data.srs[courseId] ?? []).slice()
  for (const r of itemResults) {
    const idx = entries.findIndex((e) => e.itemId === r.itemId)
    const updated = onResult(idx >= 0 ? entries[idx] : undefined, r.itemId, r.correct, now)
    if (idx >= 0) entries[idx] = updated
    else entries.push(updated)
  }
  data.srs[courseId] = entries

  const earned = earnedBadges(computeBadgeStats(data, courses))
  const newBadges = earned.filter((b) => !data.badges.includes(b))
  data.badges = Array.from(new Set([...data.badges, ...earned]))

  return {
    state: { ...state, data: { ...state.data, [profileId]: data } },
    result: { xp, newBadges },
  }
}

/** XP de la semaine en cours (lundi → dimanche, heure de Paris) */
export function weekXp(data: ProfileData, now: number): number {
  const today = parisDay(now)
  const d = new Date(today + 'T12:00:00Z')
  const dayOfWeek = (d.getUTCDay() + 6) % 7 // lundi = 0
  let total = 0
  for (let i = 0; i <= dayOfWeek; i++) {
    const day = parisDay(now - i * 86_400_000)
    total += data.xpByDay[day] ?? 0
  }
  return total
}

export interface ProfileExport {
  app: 'yalla'
  version: 1
  profile: Profile
  data: ProfileData
}

export function exportProfile(s: AppState, profileId: string): string {
  const profile = s.profiles.find((p) => p.id === profileId)
  const data = s.data[profileId]
  if (!profile || !data) throw new Error('Profil introuvable')
  const payload: ProfileExport = { app: 'yalla', version: 1, profile, data }
  return JSON.stringify(payload, null, 2)
}

// ===== Corbeille : une suppression de profil doit toujours être rattrapable =====

const TRASH_KEY = 'yalla.v1.corbeille'

export interface TrashEntry {
  profile: Profile
  data: ProfileData
  deletedAt: number
}

export function loadTrash(): TrashEntry[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY)
    const parsed = raw ? (JSON.parse(raw) as TrashEntry[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Garde les 3 dernières suppressions */
export function pushTrash(profile: Profile, data: ProfileData, now: number): void {
  try {
    const next = [{ profile, data, deletedAt: now }, ...loadTrash()].slice(0, 3)
    localStorage.setItem(TRASH_KEY, JSON.stringify(next))
  } catch {
    // stockage plein : la suppression reste possible, sans filet
  }
}

export function dropFromTrash(profileId: string): void {
  try {
    localStorage.setItem(
      TRASH_KEY,
      JSON.stringify(loadTrash().filter((e) => e.profile.id !== profileId))
    )
  } catch {
    // rien à faire
  }
}

export function importProfile(s: AppState, json: string): AppState {
  let parsed: ProfileExport
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("Fichier invalide : ce n'est pas un export Yalla")
  }
  if (parsed?.app !== 'yalla' || !parsed.profile?.id || !parsed.data) {
    throw new Error("Fichier invalide : ce n'est pas un export Yalla")
  }
  const others = s.profiles.filter((p) => p.id !== parsed.profile.id)
  return {
    ...s,
    profiles: [...others, parsed.profile],
    // on active le profil restauré : sinon, sur un téléphone neuf, l'import
    // « ne faisait rien » de visible
    activeProfileId: parsed.profile.id,
    data: { ...s.data, [parsed.profile.id]: parsed.data },
  }
}
