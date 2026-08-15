import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AppProvider, useApp } from './store/state'
import { delaiAvantRappel, etatDuJour, notifier, PREFS_DEFAUT } from './engine/reminders'
import { displayStreak, parisDay } from './engine/gamification'
import { RouterProvider, useRouter } from './ui/Router'
import { BottomNav } from './ui/components/BottomNav'
import { TopBar } from './ui/components/TopBar'
import { CourseScreen } from './ui/screens/CourseScreen'
import { HomeScreen } from './ui/screens/HomeScreen'
import { LeaderboardScreen } from './ui/screens/LeaderboardScreen'
import { LessonScreen } from './ui/screens/LessonScreen'
import { ProfilesScreen } from './ui/screens/ProfilesScreen'
import { SettingsScreen } from './ui/screens/SettingsScreen'

function Chrome({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      {children}
      <BottomNav />
    </>
  )
}

function Shell() {
  const { profile, data } = useApp()
  const { segments } = useRouter()

  // applique le thème choisi (sinon suit le réglage du téléphone)
  useEffect(() => {
    if (data?.theme) document.documentElement.dataset.theme = data.theme
    else delete document.documentElement.dataset.theme
  }, [data?.theme])

  // Rappel « app ouverte » : une notification au moment choisi, si elle est
  // autorisée. Le rappel qui marche app fermée, lui, passe par le calendrier.
  useEffect(() => {
    const prefs = data?.rappel ?? PREFS_DEFAUT
    if (!prefs.actif || !data) return
    const delai = delaiAvantRappel(prefs, Date.now())
    if (delai === null) return
    const t = setTimeout(() => {
      const etat = etatDuJour({
        xpAujourdhui: data.xpByDay[parisDay(Date.now())] ?? 0,
        objectif: data.dailyGoal,
        serie: displayStreak(data.streak, Date.now()),
        heure: new Date().getHours(),
      })
      if (etat.doitRappeler) notifier('Yalla !', etat.message)
    }, delai)
    return () => clearTimeout(t)
  }, [data])

  if (!profile) return <ProfilesScreen />

  const [s0, s1, s2] = segments
  if (s0 === 'profils') return <ProfilesScreen />
  if (s0 === 'cours' && s1)
    return (
      <Chrome>
        <CourseScreen courseId={s1} />
      </Chrome>
    )
  if (s0 === 'lecon' && s1 && s2) return <LessonScreen courseId={s1} lessonId={s2} />
  if (s0 === 'revision' && s1) return <LessonScreen courseId={s1} review />
  if (s0 === 'classement')
    return (
      <Chrome>
        <LeaderboardScreen />
      </Chrome>
    )
  if (s0 === 'reglages')
    return (
      <Chrome>
        <SettingsScreen />
      </Chrome>
    )
  return (
    <Chrome>
      <HomeScreen />
    </Chrome>
  )
}

export default function App() {
  return (
    <AppProvider>
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </AppProvider>
  )
}
