export type CourseId = 'en' | 'ar' | 'dz'

export interface VocabItem {
  id: string
  /** Texte en langue cible (en: anglais, ar: écriture arabe, dz: phonétique latine) */
  text: string
  /** Traduction française */
  fr: string
  /** Phonétique (obligatoire pour l'arabe littéraire) */
  phon?: string
  /** Écriture arabe (obligatoire pour la darija — sert au TTS/STT) */
  arScript?: string
  emoji?: string
  /** true = adapté aux enfants */
  kid?: boolean
}

export interface Letter {
  id: string
  char: string
  name: string
  phon: string
  /** Nom arabe vocalisé de la lettre (ex بَاء) — utilisé pour l'audio */
  arName?: string
  /** true pour une voyelle brève / un signe orthographique (pas une des 28 lettres) */
  sign?: boolean
  forms: {
    isolated: string
    initial: string
    medial: string
    final: string
  }
}

export interface Lesson {
  id: string
  title: string
  kind: 'vocab' | 'letters'
  items?: VocabItem[]
  letters?: Letter[]
}

export interface Unit {
  id: string
  title: string
  icon: string
  lessons: Lesson[]
}

export interface Course {
  id: CourseId
  title: string
  flag: string
  /** Langue pour la synthèse vocale (ex: en-US, ar-SA) */
  ttsLang: string
  /** Langue pour la reconnaissance micro (ex: en-US, ar-SA, ar-DZ) */
  sttLang: string
  units: Unit[]
}
