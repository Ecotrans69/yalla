import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CourseId } from '../content/types'
import { getCourses } from '../content'
import { currentHearts, loseHeart } from '../engine/gamification'
import {
  applyLessonCompletion,
  defaultProfileData,
  exportProfile,
  importProfile,
  loadState,
  saveState,
  type AppState,
  type LessonResult,
  type Profile,
  type ProfileData,
} from './storage'

interface AppApi {
  state: AppState
  profile?: Profile
  data?: ProfileData
  addProfile(name: string, avatar: string, kid: boolean): void
  selectProfile(id: string | undefined): void
  deleteProfile(id: string): void
  completeLesson(
    courseId: CourseId,
    lessonId: string,
    exCount: number,
    mistakes: number,
    itemResults: { itemId: string; correct: boolean }[]
  ): LessonResult
  spendHeart(): void
  refreshHearts(): void
  setGoal(n: number): void
  setTheme(t: 'light' | 'dark' | undefined): void
  setVoice(v: import('../speech/audio').VoiceChoice): void
  exportActive(): string
  importJson(json: string): void
}

const AppCtx = createContext<AppApi | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  const update = useCallback((updater: (s: AppState) => AppState) => {
    setState((prev) => {
      const next = updater(prev)
      saveState(next)
      return next
    })
  }, [])

  const patchData = useCallback(
    (fn: (d: ProfileData) => ProfileData) => {
      update((s) => {
        if (!s.activeProfileId) return s
        const d = s.data[s.activeProfileId] ?? defaultProfileData(Date.now())
        return { ...s, data: { ...s.data, [s.activeProfileId]: fn(structuredClone(d)) } }
      })
    },
    [update]
  )

  const api = useMemo<AppApi>(() => {
    const profile = state.profiles.find((p) => p.id === state.activeProfileId)
    const data = profile ? state.data[profile.id] : undefined
    return {
      state,
      profile,
      data,
      addProfile(name, avatar, kid) {
        const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
        const now = Date.now()
        update((s) => ({
          ...s,
          profiles: [...s.profiles, { id, name, avatar, kid, createdAt: now }],
          activeProfileId: id,
          data: { ...s.data, [id]: defaultProfileData(now) },
        }))
      },
      selectProfile(id) {
        update((s) => ({ ...s, activeProfileId: id }))
      },
      deleteProfile(id) {
        update((s) => {
          const data = { ...s.data }
          delete data[id]
          return {
            ...s,
            profiles: s.profiles.filter((p) => p.id !== id),
            activeProfileId: s.activeProfileId === id ? undefined : s.activeProfileId,
            data,
          }
        })
      },
      completeLesson(courseId, lessonId, exCount, mistakes, itemResults) {
        let result: LessonResult = { xp: 0, newBadges: [] }
        update((s) => {
          if (!s.activeProfileId) return s
          const applied = applyLessonCompletion(
            s,
            s.activeProfileId,
            getCourses(),
            courseId,
            lessonId,
            exCount,
            mistakes,
            itemResults,
            Date.now()
          )
          result = applied.result
          return applied.state
        })
        return result
      },
      spendHeart() {
        patchData((d) => ({ ...d, hearts: loseHeart(d.hearts, Date.now()) }))
      },
      refreshHearts() {
        patchData((d) => ({ ...d, hearts: currentHearts(d.hearts, Date.now()) }))
      },
      setGoal(n) {
        patchData((d) => ({ ...d, dailyGoal: n }))
      },
      setTheme(t) {
        patchData((d) => ({ ...d, theme: t }))
      },
      setVoice(v) {
        patchData((d) => ({ ...d, voice: v }))
      },
      exportActive() {
        if (!state.activeProfileId) throw new Error('Aucun profil actif')
        return exportProfile(state, state.activeProfileId)
      },
      importJson(json) {
        update((s) => importProfile(s, json))
      },
    }
  }, [state, update, patchData])

  return <AppCtx.Provider value={api}>{children}</AppCtx.Provider>
}

export function useApp(): AppApi {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp doit être utilisé sous <AppProvider>')
  return ctx
}
