import type { Course, Lesson, VocabItem, Letter } from '../content/types'
import { normalize } from './normalize'

export type ExerciseType =
  | 'new_word'
  | 'select_image'
  | 'translate_tiles'
  | 'match_pairs'
  | 'fill_blank'
  | 'listen_choose'
  | 'listen_type'
  | 'speak_repeat'
  | 'letter_intro'
  | 'letter_forms'

export interface Choice {
  id: string
  label: string
  sub?: string
  emoji?: string
}

export interface Exercise {
  type: ExerciseType
  item?: VocabItem
  letter?: Letter
  question?: string
  choices?: Choice[]
  correctId?: string
  tiles?: string[]
  pairs?: { a: string; b: string }[]
}

export interface BuildOpts {
  kid: boolean
  sttAvailable: boolean
  ttsAvailable: boolean
  rng: () => number
  /** Session de révision : pas de découverte, on drille les items donnés */
  reviewIds?: string[]
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Tous les items vocab d'un cours */
export function coursePool(course: Course): VocabItem[] {
  return course.units.flatMap((u) =>
    u.lessons.flatMap((l) => (l.kind === 'vocab' ? (l.items ?? []) : []))
  )
}

function distractorItems(
  pool: VocabItem[],
  item: VocabItem,
  n: number,
  rng: () => number
): VocabItem[] {
  const candidates = pool.filter((p) => p.id !== item.id && p.text !== item.text && p.fr !== item.fr)
  return shuffle(candidates, rng).slice(0, n)
}

function toChoice(i: VocabItem, showPhon: boolean): Choice {
  return { id: i.id, label: i.text, sub: showPhon ? i.phon : undefined, emoji: i.emoji }
}

// ===== Fabriques d'exercices =====

function exNewWord(item: VocabItem): Exercise {
  return { type: 'new_word', item }
}

function exSelect(item: VocabItem, pool: VocabItem[], rng: () => number, ar: boolean): Exercise {
  const choices = shuffle(
    [toChoice(item, ar), ...distractorItems(pool, item, 3, rng).map((d) => toChoice(d, ar))],
    rng
  )
  return {
    type: 'select_image',
    item,
    question: `Comment dit-on « ${item.fr} » ?`,
    choices,
    correctId: item.id,
  }
}

function exListenChoose(
  item: VocabItem,
  pool: VocabItem[],
  rng: () => number,
  ar: boolean
): Exercise {
  const choices = shuffle(
    [toChoice(item, ar), ...distractorItems(pool, item, 3, rng).map((d) => toChoice(d, ar))],
    rng
  )
  return {
    type: 'listen_choose',
    item,
    question: "Qu'as-tu entendu ?",
    choices,
    correctId: item.id,
  }
}

function exListenType(item: VocabItem): Exercise {
  return { type: 'listen_type', item, question: 'Écris ce que tu entends' }
}

function exSpeak(item: VocabItem): Exercise {
  return { type: 'speak_repeat', item, question: 'Écoute et répète à voix haute' }
}

function words(s: string): string[] {
  return s.split(/\s+/).filter(Boolean)
}

function exTiles(item: VocabItem, pool: VocabItem[], rng: () => number): Exercise {
  const target = words(item.text)
  const targetNorm = new Set(target.map((w) => normalize(w, 'fr')))
  const distractorWords: string[] = []
  for (const p of shuffle(pool, rng)) {
    for (const w of words(p.text)) {
      if (!targetNorm.has(normalize(w, 'fr')) && !distractorWords.includes(w)) {
        distractorWords.push(w)
        if (distractorWords.length >= 3) break
      }
    }
    if (distractorWords.length >= 3) break
  }
  return {
    type: 'translate_tiles',
    item,
    question: `Traduis : « ${item.fr} »`,
    tiles: shuffle([...target, ...distractorWords], rng),
  }
}

function exFillBlank(item: VocabItem, pool: VocabItem[], rng: () => number): Exercise {
  const target = words(item.text)
  const idx = Math.floor(rng() * target.length)
  const missing = target[idx]
  const sentence = target.map((w, i) => (i === idx ? '____' : w)).join(' ')
  const distractorWords: string[] = []
  const missingNorm = normalize(missing, 'fr')
  for (const p of shuffle(pool, rng)) {
    for (const w of words(p.text)) {
      if (normalize(w, 'fr') !== missingNorm && !distractorWords.includes(w)) {
        distractorWords.push(w)
        if (distractorWords.length >= 3) break
      }
    }
    if (distractorWords.length >= 3) break
  }
  return {
    type: 'fill_blank',
    item,
    question: `Complète : « ${item.fr} »\n${sentence}`,
    choices: shuffle(
      [
        { id: missing, label: missing },
        ...distractorWords.map((w) => ({ id: w, label: w })),
      ],
      rng
    ),
    correctId: missing,
  }
}

function exPairs(items: VocabItem[]): Exercise {
  return {
    type: 'match_pairs',
    question: 'Associe les paires',
    pairs: items.map((i) => ({ a: i.fr, b: i.text })),
  }
}

function letterToItem(letter: Letter): VocabItem {
  return { id: letter.id, text: letter.char, fr: letter.name, phon: letter.phon }
}

function exLetterIntro(letter: Letter): Exercise {
  return { type: 'letter_intro', letter, item: letterToItem(letter) }
}

function exLetterForms(letter: Letter, all: Letter[], rng: () => number): Exercise {
  // Variante 1 : reconnaître la forme selon la position (si les formes diffèrent assez)
  const forms = [
    { id: 'initial', label: letter.forms.initial },
    { id: 'isolated', label: letter.forms.isolated },
    { id: 'medial', label: letter.forms.medial },
    { id: 'final', label: letter.forms.final },
  ]
  const uniqueLabels = new Set(forms.map((f) => f.label))
  if (uniqueLabels.size >= 3 && rng() < 0.5) {
    const seen = new Set<string>()
    const choices = forms.filter((f) => {
      if (seen.has(f.label)) return false
      seen.add(f.label)
      return true
    })
    return {
      type: 'letter_forms',
      letter,
      item: letterToItem(letter),
      question: `La lettre ${letter.name} au DÉBUT d'un mot ?`,
      choices: shuffle(choices, rng),
      correctId: 'initial',
    }
  }
  // Variante 2 : quelle lettre fait ce son ?
  const others = shuffle(
    all.filter((l) => l.id !== letter.id && l.phon !== letter.phon),
    rng
  ).slice(0, 3)
  return {
    type: 'letter_forms',
    letter,
    item: letterToItem(letter),
    question: `Quelle lettre fait le son « ${letter.phon} » ?`,
    choices: shuffle(
      [
        { id: letter.id, label: letter.char },
        ...others.map((o) => ({ id: o.id, label: o.char })),
      ],
      rng
    ),
    correctId: letter.id,
  }
}

// ===== Construction d'une leçon =====

function buildLettersLesson(lesson: Lesson, opts: BuildOpts): Exercise[] {
  const letters = lesson.letters ?? []
  const out: Exercise[] = []
  for (const letter of letters) {
    out.push(exLetterIntro(letter))
  }
  for (const letter of shuffle(letters, opts.rng)) {
    out.push(exLetterForms(letter, letters, opts.rng))
  }
  if (opts.sttAvailable && opts.ttsAvailable) {
    for (const letter of shuffle(letters, opts.rng).slice(0, 2)) {
      out.push(exSpeak(letterToItem(letter)))
    }
  }
  return out
}

function dedicatedExercise(
  item: VocabItem,
  course: Course,
  pool: VocabItem[],
  opts: BuildOpts,
  forceSpeak: boolean
): Exercise {
  const ar = course.id === 'ar'
  const latinScript = course.id !== 'ar'
  const multiword = words(item.text).length >= 2

  if (forceSpeak && opts.sttAvailable && opts.ttsAvailable) return exSpeak(item)

  type Maker = () => Exercise
  const eligible: Maker[] = []
  eligible.push(() => exSelect(item, pool, opts.rng, ar))
  if (opts.ttsAvailable) eligible.push(() => exListenChoose(item, pool, opts.rng, ar))
  if (opts.ttsAvailable && latinScript && !opts.kid) eligible.push(() => exListenType(item))
  if (multiword) eligible.push(() => exTiles(item, pool, opts.rng))
  if (multiword && !opts.kid) eligible.push(() => exFillBlank(item, pool, opts.rng))
  if (opts.sttAvailable && opts.ttsAvailable) eligible.push(() => exSpeak(item))

  return eligible[Math.floor(opts.rng() * eligible.length)]()
}

export function buildLesson(course: Course, lesson: Lesson, opts: BuildOpts): Exercise[] {
  if (lesson.kind === 'letters') return buildLettersLesson(lesson, opts)

  const pool = coursePool(course)
  const out: Exercise[] = []

  // Mode révision : on drille les items donnés, sans découverte
  if (opts.reviewIds?.length) {
    const byId = new Map(pool.map((i) => [i.id, i]))
    const items = opts.reviewIds.map((id) => byId.get(id)).filter((i): i is VocabItem => !!i)
    for (const item of shuffle(items, opts.rng)) {
      out.push(exSelect(item, pool, opts.rng, course.id === 'ar'))
      if (opts.ttsAvailable) out.push(exListenChoose(item, pool, opts.rng, course.id === 'ar'))
    }
    return out
  }

  const items = shuffle(lesson.items ?? [], opts.rng)
  const introCount = Math.min(4, items.length)
  const intro = items.slice(0, introCount)
  const rest = items.slice(introCount)

  // 1. Découverte des nouveaux mots
  for (const item of intro) out.push(exNewWord(item))

  // 2. Paires pour les autres items (chunks de 4-5)
  let i = 0
  while (rest.length - i >= 3) {
    const size = rest.length - i === 5 ? 5 : Math.min(4, rest.length - i)
    out.push(exPairs(rest.slice(i, i + size)))
    i += size
  }
  for (const leftover of rest.slice(i)) {
    out.push(
      opts.ttsAvailable
        ? exListenChoose(leftover, pool, opts.rng, course.id === 'ar')
        : exSelect(leftover, pool, opts.rng, course.id === 'ar')
    )
  }

  // 3. Un exercice dédié par item — au moins un speak_repeat si possible
  const drillOrder = shuffle(items, opts.rng)
  const speakIdx =
    opts.sttAvailable && opts.ttsAvailable ? Math.floor(opts.rng() * drillOrder.length) : -1
  drillOrder.forEach((item, idx) => {
    out.push(dedicatedExercise(item, course, pool, opts, idx === speakIdx))
  })

  return out
}
