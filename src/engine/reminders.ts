/**
 * Rappels quotidiens — Yalla!
 *
 * CONTRAINTE DE DÉPART : l'app est une PWA statique servie par GitHub Pages, il n'y a
 * AUCUN serveur. Sans serveur, pas de Web Push : rien ne peut réveiller le téléphone
 * quand l'app est fermée. On ne fait donc semblant de rien (pas de faux push, pas de
 * `showTrigger` expérimental) et on s'appuie sur les trois seuls mécanismes honnêtes :
 *
 *   1. `icsQuotidien()` — un fichier .ics ajouté au calendrier du téléphone en un tap.
 *      C'est le SEUL rappel qui marche app fermée, iPhone comme Android, et il ne
 *      demande aucun serveur : c'est l'agenda natif qui sonne, tous les jours.
 *   2. `notifier()` — l'API Notification, qui ne marche QUE si l'app est ouverte (ou
 *      vient de l'être). Utile quand l'onglet traîne en arrière-plan, jamais au-delà.
 *   3. `etatDuJour()` — le rappel affiché DANS l'app, à l'accueil.
 *
 * HEURE LOCALE, volontairement : contrairement aux séries qui sont calées sur l'heure
 * de France (cf. gamification.parisDay, pour que toute la famille change de jour au
 * même moment), un rappel est PERSONNEL. En vacances au Canada, l'enfant veut sonner
 * à 18h30 chez lui, pas à 12h30. Le .ics emploie donc une heure « flottante »
 * (DTSTART sans fuseau ni Z), qui suit l'appareil — c'est exactement la sémantique
 * voulue, et ça évite d'embarquer un bloc VTIMEZONE fragile.
 */

/** URL publique de l'app — mise dans le .ics pour qu'un tap sur le rappel l'ouvre */
export const URL_APP = 'https://ecotrans69.github.io/yalla/'

/** À partir de cette heure locale, on considère que la journée file (série en danger) */
export const HEURE_TARD = 18

/** Objectif de repli si on nous en passe un absurde (0, négatif, NaN) — cf. store.dailyGoal */
const OBJECTIF_DEFAUT = 20

export interface ReminderPrefs {
  actif: boolean
  /** Heure locale de l'appareil, 0–23 */
  heure: number
  /** Minute locale, 0–59 */
  minute: number
}

/** Rappel désactivé par défaut : c'est un choix explicite du parent, jamais imposé */
export const PREFS_DEFAUT: ReminderPrefs = { actif: false, heure: 18, minute: 30 }

// ============================================================================
// Outils communs
// ============================================================================

function p2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Borne une valeur, en se méfiant de NaN/Infinity venus d'un vieux localStorage */
function borner(v: number, min: number, max: number, defaut: number): number {
  if (!Number.isFinite(v)) return defaut
  return Math.min(max, Math.max(min, Math.floor(v)))
}

function normaliserHoraire(h: number, m: number): { heure: number; minute: number } {
  return {
    heure: borner(h, 0, 23, PREFS_DEFAUT.heure),
    minute: borner(m, 0, 59, PREFS_DEFAUT.minute),
  }
}

/**
 * Un horodatage doit tenir dans la plage de `Date` (±8.64e15 ms). Au-delà, la date
 * est « Invalid » et TOUT ce qu'on en tire vaut NaN, en silence : un fichier
 * `DTSTAMP:0NaNNaNNaN...` que le calendrier refuse, et surtout un délai NaN, que
 * `setTimeout` traite comme 0 — le rappel se re-déclencherait alors en boucle.
 * `Number.isFinite` seul ne suffit pas : 1e21 est fini et hors plage.
 */
const TS_MAX = 8.64e15

function tsValide(ts: unknown): boolean {
  return typeof ts === 'number' && Number.isFinite(ts) && Math.abs(ts) <= TS_MAX
}

/** « Léïla-Jeanne » → « leila-jeanne » : ASCII pur, sûr pour un nom de fichier et un UID */
function slug(s: string | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // enlève les accents détachés par le NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    // La coupe peut retomber pile sur un tiret (prénom composé de 32+ caractères) :
    // sans ce second nettoyage on fabrique « yalla-rappel-marie-ange-.ics » et un
    // UID « …marie-ange-@… ».
    .replace(/-+$/, '')
}

// ============================================================================
// 1. Fichier calendrier .ics — le seul rappel qui marche app fermée
// ============================================================================

/**
 * Échappement RFC 5545 pour une valeur TEXT. L'ordre compte : l'antislash d'abord,
 * sinon on ré-échapperait les antislashs qu'on vient d'ajouter.
 * (Les deux-points et les apostrophes ne s'échappent PAS dans une valeur TEXT.)
 */
function echapperTexte(v: string): string {
  return v
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Pliage RFC 5545 : une ligne ne doit pas dépasser 75 OCTETS (pas 75 caractères —
 * un « é » en pèse 2, un tiret cadratin 3, un émoji 4). On itère par point de code
 * pour ne jamais couper au milieu d'un caractère, ce qui produirait un fichier
 * illisible par le calendrier. Les lignes suivantes commencent par une espace.
 */
function plierLigne(ligne: string): string[] {
  const enc = new TextEncoder()
  const sorties: string[] = []
  let courante = ''
  let octets = 0
  for (const ch of ligne) {
    const n = enc.encode(ch).length
    if (octets + n > 75) {
      sorties.push(courante)
      courante = ' '
      octets = 1
    }
    courante += ch
    octets += n
  }
  sorties.push(courante)
  return sorties
}

/** Horodatage « flottant » (heure locale de l'appareil, sans Z) : 20260815T183000 */
function dateIcsLocale(ts: number): string {
  const d = new Date(ts)
  return (
    String(d.getFullYear()).padStart(4, '0') +
    p2(d.getMonth() + 1) +
    p2(d.getDate()) +
    'T' +
    p2(d.getHours()) +
    p2(d.getMinutes()) +
    p2(d.getSeconds())
  )
}

/** DTSTAMP, lui, DOIT être en UTC d'après la norme : 20260815T113000Z */
function dateIcsUtc(ts: number): string {
  const d = new Date(ts)
  return (
    String(d.getUTCFullYear()).padStart(4, '0') +
    p2(d.getUTCMonth() + 1) +
    p2(d.getUTCDate()) +
    'T' +
    p2(d.getUTCHours()) +
    p2(d.getUTCMinutes()) +
    p2(d.getUTCSeconds()) +
    'Z'
  )
}

/**
 * UID stable, volontairement indépendant de l'heure choisie : si le parent change
 * 18h30 en 19h00 et ré-ajoute le fichier, le calendrier MET À JOUR l'événement au
 * lieu d'en créer un deuxième qui sonnerait aussi à l'ancienne heure.
 */
function uidRappel(prenom?: string): string {
  return `yalla-rappel-${slug(prenom) || 'famille'}@ecotrans69.github.io`
}

export interface OptionsIcs {
  heure: number
  minute: number
  prenom?: string
  /** Injectable pour les tests ; sinon « maintenant » */
  maintenant?: number
}

/**
 * Contenu d'un fichier .ics valide : un événement quotidien récurrent avec une
 * alarme à l'heure dite. À enregistrer puis ouvrir sur le téléphone — iOS et
 * Android proposent tous les deux de l'ajouter au calendrier en un tap.
 */
export function icsQuotidien(opts: OptionsIcs): string {
  const maintenant = tsValide(opts?.maintenant) ? (opts.maintenant as number) : Date.now()
  const { heure, minute } = normaliserHoraire(opts?.heure, opts?.minute)
  const prenom = opts?.prenom?.trim()

  // Premier créneau à venir : sinon le calendrier partirait d'une date passée et
  // certains téléphones affichent alors une pile de rappels « en retard ».
  const debut = prochainDeclenchement({ actif: true, heure, minute }, maintenant) as number

  const titre = prenom
    ? `Yalla ${prenom}! — 5 minutes d'anglais et d'arabe`
    : "Yalla! — 5 minutes d'anglais et d'arabe"
  const description = `Ouvre l'app, fais ta leçon du jour et garde ta série.\n${URL_APP}`

  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yalla//Rappel quotidien//FR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uidRappel(prenom)}`,
    // SEQUENCE doit croître pour qu'un ré-import écrase la version précédente :
    // les minutes écoulées depuis 1970 font un compteur monotone gratuit.
    `SEQUENCE:${Math.max(0, Math.floor(maintenant / 60000))}`,
    `DTSTAMP:${dateIcsUtc(maintenant)}`,
    `DTSTART:${dateIcsLocale(debut)}`,
    // 5 min de leçon + le temps d'ouvrir l'app : assez court pour ne pas manger l'agenda
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${echapperTexte(titre)}`,
    `DESCRIPTION:${echapperTexte(description)}`,
    `URL:${URL_APP}`,
    // le rappel ne doit pas faire passer le parent pour « occupé »
    'TRANSP:TRANSPARENT',
    'CATEGORIES:Yalla',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    // PT0S = pile à l'heure de l'événement
    'TRIGGER;RELATED=START:PT0S',
    `DESCRIPTION:${echapperTexte(titre)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  // CRLF partout, y compris à la fin : la norme iCalendar l'exige, et plusieurs
  // calendriers refusent purement et simplement un fichier en LF seul.
  return lignes.flatMap(plierLigne).join('\r\n') + '\r\n'
}

/** Nom de fichier proposé au téléchargement (ASCII, sans espace ni accent) */
export function nomFichierIcs(prenom?: string): string {
  const s = slug(prenom)
  return s ? `yalla-rappel-${s}.ics` : 'yalla-rappel.ics'
}

/**
 * Le .ics sous forme d'URL de données : l'UI n'a plus qu'à faire
 * `<a href={icsDataUrl(...)} download={nomFichierIcs(...)}>`. Pas de btoa ici —
 * il explose sur les accents ; le pourcentage-encodage passe partout.
 */
export function icsDataUrl(opts: OptionsIcs): string {
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsQuotidien(opts))
}

// ============================================================================
// 2. Planification dans l'app (app ouverte uniquement)
// ============================================================================

/**
 * Timestamp du prochain rappel : aujourd'hui si l'heure n'est pas encore passée,
 * sinon demain. `null` si le rappel est désactivé.
 */
export function prochainDeclenchement(prefs: ReminderPrefs, maintenant: number): number | null {
  if (!prefs?.actif) return null
  if (!tsValide(maintenant)) return null
  const { heure, minute } = normaliserHoraire(prefs.heure, prefs.minute)

  const d = new Date(maintenant)
  d.setHours(heure, minute, 0, 0)
  // Pile à l'heure, on vise déjà demain : le rappel de l'instant présent vient
  // d'être déclenché, et se re-programmer sur le même instant ferait une boucle.
  // setDate() garde l'heure de l'horloge murale : la nuit du changement d'heure,
  // le rappel reste à 18h30, il ne glisse pas à 17h30.
  if (d.getTime() <= maintenant) d.setDate(d.getDate() + 1)
  return d.getTime()
}

/** Délai en ms avant le prochain rappel, prêt pour un `setTimeout` (jamais négatif) */
export function delaiAvantRappel(prefs: ReminderPrefs, maintenant: number): number | null {
  const t = prochainDeclenchement(prefs, maintenant)
  return t === null ? null : Math.max(0, t - maintenant)
}

/** « 18:30 » — pour l'afficher dans les réglages */
export function formaterHeure(prefs: Pick<ReminderPrefs, 'heure' | 'minute'>): string {
  const { heure, minute } = normaliserHoraire(prefs?.heure, prefs?.minute)
  return `${p2(heure)}:${p2(minute)}`
}

// ============================================================================
// 3. Message du jour, affiché dans l'app
// ============================================================================

export type RaisonRappel = 'objectif_atteint' | 'serie_en_danger' | 'rien_a_faire' | 'jamais_joue'

export type EtatRappel = {
  /** Vrai s'il y a une vraie raison de déranger l'enfant (notification, pastille) */
  doitRappeler: boolean
  raison: RaisonRappel
  /** Phrase courte, tutoiement, lisible par un enfant de 6 ans */
  message: string
}

export interface ArgsEtatDuJour {
  xpAujourdhui: number
  objectif: number
  /** Série en cours, en jours (0 = aucune série) */
  serie: number
  /** Heure locale actuelle, 0–23 */
  heure: number
}

/**
 * Le message affiché à l'accueil, et la décision « faut-il notifier ? ».
 *
 * Quatre cas, dans cet ordre de priorité :
 *  - `objectif_atteint`  : c'est gagné, on félicite et on ne dérange plus.
 *  - `serie_en_danger`   : une série est en cours, l'objectif n'est pas fait et il est tard.
 *  - `jamais_joue`       : aucune série ET rien fait aujourd'hui — l'enfant démarre ou
 *                          redémarre une série (on ne peut pas distinguer les deux avec
 *                          ces seules données, le message vaut donc pour les deux).
 *  - `rien_a_faire`      : il reste des XP mais rien d'urgent, on n'interrompt pas.
 */
export function etatDuJour(args: ArgsEtatDuJour): EtatRappel {
  const xp = Number.isFinite(args?.xpAujourdhui) ? Math.max(0, args.xpAujourdhui) : 0
  const cible = Number.isFinite(args?.objectif) && args.objectif > 0 ? args.objectif : OBJECTIF_DEFAUT
  const serie = Number.isFinite(args?.serie) ? Math.max(0, Math.floor(args.serie)) : 0
  const heure = Number.isFinite(args?.heure) ? args.heure : 0
  const tard = heure >= HEURE_TARD

  if (xp >= cible) {
    return {
      doitRappeler: false,
      raison: 'objectif_atteint',
      message:
        serie >= 2
          ? `Bravo ! Objectif atteint, ${serie} jours de suite 🔥`
          : 'Bravo ! Ton objectif du jour est atteint 🎉',
    }
  }

  if (serie >= 1 && tard) {
    return {
      doitRappeler: true,
      raison: 'serie_en_danger',
      message:
        serie === 1
          ? 'Vite ! Une leçon pour garder ta série 🔥'
          : `Vite ! Une leçon pour garder tes ${serie} jours de suite 🔥`,
    }
  }

  if (serie === 0 && xp === 0) {
    return {
      doitRappeler: true,
      raison: 'jamais_joue',
      message: 'Yalla ! Une leçon pour démarrer ta série 🌱',
    }
  }

  const reste = Math.max(1, Math.ceil(cible - xp))
  return {
    doitRappeler: false,
    raison: 'rien_a_faire',
    message:
      serie >= 2
        ? `${serie} jours de suite ! Plus que ${reste} XP aujourd'hui.`
        : `Plus que ${reste} XP pour ton objectif du jour. Yalla !`,
  }
}

// ============================================================================
// 4. Notifications navigateur — app ouverte (ou tout juste refermée) seulement
// ============================================================================

const TAG_RAPPEL = 'yalla-rappel'

function iconeRappel(): string | undefined {
  try {
    return `${import.meta.env?.BASE_URL ?? '/'}icons/icon-192.png`
  } catch {
    return undefined
  }
}

/** L'API existe-t-elle ET l'a-t-on autorisée ? Toute anomalie répond « non ». */
export function peutNotifier(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    )
  } catch {
    return false
  }
}

/**
 * Demande l'autorisation. Ne doit être appelée que sur un geste de l'utilisateur
 * (bouton) : sinon Safari et Chrome refusent d'office, et le refus est définitif.
 */
export async function demanderPermission(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    // 'denied' est irréversible côté page : redemander ouvrirait une popup fantôme
    if (Notification.permission === 'denied') return false

    const reponse = await new Promise<NotificationPermission>((resolve) => {
      // Les vieux Safari ne rendent rien et passent par un callback : on gère les deux
      const p = Notification.requestPermission((etat) => resolve(etat))
      if (p && typeof p.then === 'function') p.then(resolve, () => resolve('denied'))
    })
    return reponse === 'granted'
  } catch {
    return false
  }
}

function notifierViaServiceWorker(titre: string, options: NotificationOptions): void {
  try {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
    if (!sw?.ready) return
    sw.ready.then((reg) => reg.showNotification(titre, options)).catch(() => {})
  } catch {
    // pas de service worker : tant pis, l'app affiche déjà le rappel à l'écran
  }
}

/**
 * Affiche une notification si (et seulement si) c'est autorisé. Silencieuse sinon,
 * et ne lève JAMAIS : un rappel raté ne doit pas casser l'écran d'un enfant.
 */
export function notifier(titre: string, corps: string): void {
  if (!peutNotifier()) return
  const options: NotificationOptions = {
    body: corps,
    lang: 'fr',
    // même tag : un nouveau rappel remplace l'ancien au lieu d'empiler
    tag: TAG_RAPPEL,
    icon: iconeRappel(),
  }
  try {
    new Notification(titre, options)
    return
  } catch {
    // Chrome Android interdit le constructeur en PWA installée et exige de passer
    // par le service worker — on tente ce chemin plutôt que d'abandonner.
  }
  notifierViaServiceWorker(titre, options)
}
