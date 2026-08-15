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

export function shuffle<T>(arr: T[], rng: () => number): T[] {
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

/** Toutes les lettres d'un cours */
export function courseLetters(course: Course): Letter[] {
  return course.units.flatMap((u) =>
    u.lessons.flatMap((l) => (l.kind === 'letters' ? (l.letters ?? []) : []))
  )
}

/**
 * Anneaux de distracteurs d'un item : sa leçon d'origine, puis son unité, puis
 * tout le cours. On pioche au plus près pour que les QCM restent cohérents
 * (« bonjour » face à « merci », pas face à un mot jamais vu).
 */
export type RingsFn = (item: VocabItem) => VocabItem[][]

export function buildRings(course: Course): RingsFn {
  const lessonOf = new Map<string, VocabItem[]>()
  const unitOf = new Map<string, VocabItem[]>()
  for (const u of course.units) {
    const unitItems = u.lessons.flatMap((l) => (l.kind === 'vocab' ? (l.items ?? []) : []))
    for (const l of u.lessons) {
      if (l.kind !== 'vocab') continue
      const li = l.items ?? []
      for (const it of li) {
        lessonOf.set(it.id, li)
        unitOf.set(it.id, unitItems)
      }
    }
  }
  const all = coursePool(course)
  return (item) => [lessonOf.get(item.id) ?? [], unitOf.get(item.id) ?? [], all]
}

/** Sens français d'un item, éclaté sur « / » et sans les parenthèses de précision */
function glosses(fr: string): string[] {
  return fr
    .split('/')
    .map((s) => s.replace(/\([^)]*\)/g, '').trim().toLowerCase())
    .filter(Boolean)
}

/** Deux items qui veulent dire la même chose ne doivent jamais s'opposer dans un QCM */
function tooClose(a: VocabItem, b: VocabItem): boolean {
  for (const ga of glosses(a.fr)) {
    for (const gb of glosses(b.fr)) {
      if (ga === gb) return true
      if (ga.startsWith(gb + ' ') || gb.startsWith(ga + ' ')) return true
    }
  }
  return false
}

function distractorItems(
  rings: VocabItem[][],
  item: VocabItem,
  n: number,
  rng: () => number
): VocabItem[] {
  const out: VocabItem[] = []
  const ids = new Set([item.id])
  const texts = new Set([item.text])
  const relaxed: VocabItem[] = []
  for (const ring of rings) {
    for (const p of shuffle(ring, rng)) {
      if (out.length >= n) break
      if (ids.has(p.id) || texts.has(p.text)) continue
      if (tooClose(p, item)) {
        relaxed.push(p)
        continue
      }
      ids.add(p.id)
      texts.add(p.text)
      out.push(p)
    }
    if (out.length >= n) break
  }
  // dernier recours : on préfère un distracteur proche à un QCM à 2 choix
  for (const p of relaxed) {
    if (out.length >= n) break
    if (ids.has(p.id) || texts.has(p.text)) continue
    ids.add(p.id)
    texts.add(p.text)
    out.push(p)
  }
  return out
}

function toChoice(i: VocabItem, showPhon: boolean): Choice {
  return { id: i.id, label: i.text, sub: showPhon ? i.phon : undefined, emoji: i.emoji }
}

// ===== Fabriques d'exercices =====

function exNewWord(item: VocabItem): Exercise {
  return { type: 'new_word', item }
}

function exSelect(item: VocabItem, rings: RingsFn, rng: () => number, ar: boolean): Exercise {
  const choices = shuffle(
    [toChoice(item, ar), ...distractorItems(rings(item), item, 3, rng).map((d) => toChoice(d, ar))],
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
  rings: RingsFn,
  rng: () => number,
  ar: boolean
): Exercise {
  const choices = shuffle(
    [toChoice(item, ar), ...distractorItems(rings(item), item, 3, rng).map((d) => toChoice(d, ar))],
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

/** Mots-pièges pris d'abord dans la leçon, puis l'unité, puis le cours */
function distractorWords(
  rings: VocabItem[][],
  exclude: Set<string>,
  n: number,
  rng: () => number
): string[] {
  const out: string[] = []
  for (const ring of rings) {
    for (const p of shuffle(ring, rng)) {
      for (const w of words(p.text)) {
        if (out.length >= n) break
        if (!exclude.has(normalize(w, 'fr')) && !out.includes(w)) out.push(w)
      }
      if (out.length >= n) break
    }
    if (out.length >= n) break
  }
  return out
}

function exTiles(item: VocabItem, rings: RingsFn, rng: () => number): Exercise {
  const target = words(item.text)
  const targetNorm = new Set(target.map((w) => normalize(w, 'fr')))
  const distractorWords_ = distractorWords(rings(item), targetNorm, 3, rng)
  return {
    type: 'translate_tiles',
    item,
    question: `Traduis : « ${item.fr} »`,
    tiles: shuffle([...target, ...distractorWords_], rng),
  }
}

function exFillBlank(item: VocabItem, rings: RingsFn, rng: () => number): Exercise {
  const target = words(item.text)
  const idx = Math.floor(rng() * target.length)
  const missing = target[idx]
  const sentence = target.map((w, i) => (i === idx ? '____' : w)).join(' ')
  const missingNorm = normalize(missing, 'fr')
  const distractorWords_ = distractorWords(rings(item), new Set([missingNorm]), 3, rng)
  return {
    type: 'fill_blank',
    item,
    question: `Complète : « ${item.fr} »\n${sentence}`,
    choices: shuffle(
      [
        { id: missing, label: missing },
        ...distractorWords_.map((w) => ({ id: w, label: w })),
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
  // arScript = nom arabe de la lettre : c'est lui que la voix prononce et
  // que la reconnaissance micro accepte (« baa » pour ب)
  return {
    id: letter.id,
    text: letter.char,
    fr: letter.name,
    phon: letter.phon,
    arScript: letter.arName,
  }
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
  // On ne fait répéter au micro que les VRAIES lettres : une voyelle brève
  // seule ne se prononce pas isolément, la reconnaissance validerait à tort.
  if (opts.sttAvailable && opts.ttsAvailable) {
    const prononcables = letters.filter((l) => !l.sign)
    for (const letter of shuffle(prononcables, opts.rng).slice(0, 2)) {
      out.push(exSpeak(letterToItem(letter)))
    }
  }
  return out
}

function dedicatedExercise(
  item: VocabItem,
  course: Course,
  rings: RingsFn,
  opts: BuildOpts,
  forceSpeak: boolean
): Exercise {
  const ar = course.id === 'ar'
  const latinScript = course.id !== 'ar'
  const multiword = words(item.text).length >= 2

  if (forceSpeak && opts.sttAvailable && opts.ttsAvailable) return exSpeak(item)

  type Maker = () => Exercise
  const eligible: Maker[] = []
  // un QCM n'a de sens qu'avec 4 choix : sous 4 items disponibles, il
  // tomberait à un pile ou face qui ferait quand même monter le SRS
  const assezDeChoix = rings(item).some((ring) => ring.length >= 4)
  if (assezDeChoix) eligible.push(() => exSelect(item, rings, opts.rng, ar))
  if (opts.ttsAvailable && assezDeChoix)
    eligible.push(() => exListenChoose(item, rings, opts.rng, ar))
  if (opts.ttsAvailable && latinScript && !opts.kid) eligible.push(() => exListenType(item))
  if (multiword) eligible.push(() => exTiles(item, rings, opts.rng))
  if (multiword && !opts.kid) eligible.push(() => exFillBlank(item, rings, opts.rng))
  if (opts.sttAvailable && opts.ttsAvailable) eligible.push(() => exSpeak(item))

  return eligible[Math.floor(opts.rng() * eligible.length)]()
}

/**
 * Ids réellement révisables : ceux qui donneront au moins un exercice.
 * À appliquer AVANT de tronquer la liste des items dus — sinon une file de
 * lettres en tête (ce sont les plus faibles) évince tout le vocabulaire.
 */
export function reviewableIds(course: Course, ids: string[]): string[] {
  const known = new Set([
    ...coursePool(course).map((i) => i.id),
    ...courseLetters(course).map((l) => l.id),
  ])
  return ids.filter((id) => known.has(id))
}

export function buildLesson(course: Course, lesson: Lesson, opts: BuildOpts): Exercise[] {
  const pool = coursePool(course)
  const rings = buildRings(course)
  const out: Exercise[] = []

  // Mode révision : on drille les items donnés, sans découverte.
  // Placé AVANT la branche « lettres » : la révision ne dépend pas du porteur.
  if (opts.reviewIds?.length) {
    const byId = new Map(pool.map((i) => [i.id, i]))
    const letterById = new Map(courseLetters(course).map((l) => [l.id, l]))
    const allLetters = courseLetters(course)
    const ar = course.id === 'ar'

    const items = opts.reviewIds.map((id) => byId.get(id)).filter((i): i is VocabItem => !!i)
    const letters = opts.reviewIds
      .map((id) => letterById.get(id))
      .filter((l): l is Letter => !!l)

    // Tour 1 : reconnaissance
    for (const item of shuffle(items, opts.rng)) out.push(exSelect(item, rings, opts.rng, ar))
    for (const letter of shuffle(letters, opts.rng)) {
      out.push(exLetterForms(letter, allLetters, opts.rng))
    }

    // Tour 2 : écoute — entrelacé, jamais collé à la 1re rencontre du même item
    if (opts.ttsAvailable) {
      const firstRound = out.map((e) => e.item?.id)
      const last = firstRound[firstRound.length - 1]
      const t2 = shuffle(items, opts.rng)
      if (t2.length > 1 && t2[0].id === last) {
        const j = 1 + Math.floor(opts.rng() * (t2.length - 1))
        ;[t2[0], t2[j]] = [t2[j], t2[0]]
      }
      for (const item of t2) out.push(exListenChoose(item, rings, opts.rng, ar))
      // les lettres : on réécoute leur nom (sans micro, pas de speak_repeat :
      // le bouton « je ne peux pas parler » vaudrait un succès non vérifié)
      const l2 = shuffle(letters, opts.rng)
      for (const letter of l2) {
        if (opts.sttAvailable) out.push(exSpeak(letterToItem(letter)))
        else out.push(exLetterForms(letter, allLetters, opts.rng))
      }
    }
    return out
  }

  if (lesson.kind === 'letters') return buildLettersLesson(lesson, opts)

  // Mode enfant : on ne sert que les items marqués « kid » (repli sur tout
  // si la leçon n'en contient pas assez pour tenir un exercice)
  const source = lesson.items ?? []
  const kidItems = source.filter((i) => i.kid)
  const items = shuffle(opts.kid && kidItems.length >= 4 ? kidItems : source, opts.rng)
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
        ? exListenChoose(leftover, rings, opts.rng, course.id === 'ar')
        : exSelect(leftover, rings, opts.rng, course.id === 'ar')
    )
  }

  // 3. Un exercice dédié par item — au moins un speak_repeat si possible
  const drillOrder = shuffle(items, opts.rng)
  const speakIdx =
    opts.sttAvailable && opts.ttsAvailable ? Math.floor(opts.rng() * drillOrder.length) : -1
  drillOrder.forEach((item, idx) => {
    out.push(dedicatedExercise(item, course, rings, opts, idx === speakIdx))
  })

  return out
}
