import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  HEURE_TARD,
  PREFS_DEFAUT,
  URL_APP,
  delaiAvantRappel,
  demanderPermission,
  etatDuJour,
  formaterHeure,
  icsDataUrl,
  icsQuotidien,
  nomFichierIcs,
  notifier,
  peutNotifier,
  prochainDeclenchement,
  type ReminderPrefs,
} from './reminders'

// Les rappels sont en heure LOCALE : on construit donc les dates de test avec le
// constructeur local (jamais Date.UTC), pour que la suite passe sous n'importe
// quel fuseau (CI en UTC comprise).
const MIDI = new Date(2026, 7, 15, 12, 0, 0, 0).getTime() // sam. 15 août 2026, 12h00
const SOIR = new Date(2026, 7, 15, 21, 0, 0, 0).getTime() // le même jour, 21h00

const PREFS: ReminderPrefs = { actif: true, heure: 18, minute: 30 }

/** Annule le pliage RFC 5545 pour comparer le contenu logique des lignes */
function deplier(ics: string): string[] {
  return ics
    .replace(/\r\n[ \t]/g, '')
    .split('\r\n')
    .filter((l) => l !== '')
}

function ligne(ics: string, prefixe: string): string {
  const l = deplier(ics).find((x) => x.startsWith(prefixe))
  if (!l) throw new Error(`ligne ${prefixe} absente`)
  return l
}

const octets = (s: string) => new TextEncoder().encode(s).length

// ============================================================================
// Fichier .ics
// ============================================================================

describe('icsQuotidien — structure du fichier', () => {
  const ics = icsQuotidien({ heure: 18, minute: 30, maintenant: MIDI })

  it('est un VCALENDAR complet', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    const l = deplier(ics)
    expect(l).toContain('VERSION:2.0')
    expect(l).toContain('CALSCALE:GREGORIAN')
    expect(l.some((x) => x.startsWith('PRODID:'))).toBe(true)
    expect(l).toContain('BEGIN:VEVENT')
    expect(l).toContain('END:VEVENT')
  })

  it('répète tous les jours', () => {
    expect(deplier(ics)).toContain('RRULE:FREQ=DAILY')
  })

  it('porte une alarme DISPLAY déclenchée pile à l’heure', () => {
    const l = deplier(ics)
    expect(l).toContain('BEGIN:VALARM')
    expect(l).toContain('ACTION:DISPLAY')
    expect(l).toContain('TRIGGER;RELATED=START:PT0S')
    expect(l).toContain('END:VALARM')
    // une VALARM DISPLAY sans DESCRIPTION est invalide et ignorée par iOS
    const alarme = l.slice(l.indexOf('BEGIN:VALARM'), l.indexOf('END:VALARM'))
    expect(alarme.some((x) => x.startsWith('DESCRIPTION:'))).toBe(true)
  })

  it('a une durée courte et n’occupe pas l’agenda', () => {
    const l = deplier(ics)
    expect(l).toContain('DURATION:PT10M')
    expect(l).toContain('TRANSP:TRANSPARENT')
    // DURATION et DTEND s'excluent mutuellement
    expect(l.some((x) => x.startsWith('DTEND'))).toBe(false)
  })

  it('renvoie vers l’app', () => {
    expect(ligne(ics, 'URL:')).toBe(`URL:${URL_APP}`)
  })

  it('n’utilise QUE des CRLF (aucun LF orphelin)', () => {
    expect(ics.includes('\n')).toBe(true)
    // tout \n doit être précédé d'un \r
    expect(/[^\r]\n/.test(ics)).toBe(false)
    expect(ics.split('\n').length).toBe(ics.split('\r\n').length)
  })

  it('ne dépasse jamais 75 octets par ligne (pliage)', () => {
    for (const l of ics.split('\r\n')) {
      expect(octets(l)).toBeLessThanOrEqual(75)
    }
  })
})

describe('icsQuotidien — DTSTART au prochain créneau', () => {
  it('aujourd’hui si l’heure n’est pas passée', () => {
    const ics = icsQuotidien({ heure: 18, minute: 30, maintenant: MIDI })
    // heure « flottante » : ni Z ni TZID, c'est voulu (heure locale de l'appareil)
    expect(ligne(ics, 'DTSTART')).toBe('DTSTART:20260815T183000')
  })

  it('demain si l’heure est passée', () => {
    const ics = icsQuotidien({ heure: 18, minute: 30, maintenant: SOIR })
    expect(ligne(ics, 'DTSTART')).toBe('DTSTART:20260816T183000')
  })

  it('DTSTAMP est en UTC (avec Z), comme l’exige la norme', () => {
    const ics = icsQuotidien({ heure: 7, minute: 5, maintenant: MIDI })
    const attendu = new Date(MIDI).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    expect(ligne(ics, 'DTSTAMP:')).toBe(`DTSTAMP:${attendu}`)
  })

  it('borne les horaires aberrants au lieu de produire un fichier cassé', () => {
    expect(ligne(icsQuotidien({ heure: 25, minute: 99, maintenant: MIDI }), 'DTSTART')).toBe(
      'DTSTART:20260815T235900'
    )
    expect(ligne(icsQuotidien({ heure: -3, minute: -1, maintenant: MIDI }), 'DTSTART')).toBe(
      'DTSTART:20260816T000000'
    )
    // NaN → repli sur l'heure par défaut, jamais « NaN » dans le fichier
    const casse = icsQuotidien({ heure: Number.NaN, minute: Number.NaN, maintenant: MIDI })
    expect(casse).not.toContain('NaN')
    expect(ligne(casse, 'DTSTART')).toBe('DTSTART:20260815T183000')
  })

  it('un `maintenant` hors plage Date retombe sur l’horloge, sans produire un fichier mort', () => {
    // 1e21 est fini : sans garde, DTSTAMP valait « 0NaNNaNNaNTNaNNaNNaNZ » et
    // SEQUENCE dépassait l'INTEGER maximal de la RFC 5545 (2147483647).
    const ics = icsQuotidien({ heure: 18, minute: 30, maintenant: 1e21 })
    expect(ics).not.toContain('NaN')
    expect(ligne(ics, 'DTSTAMP:')).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/)
    expect(ligne(ics, 'DTSTART')).toMatch(/^DTSTART:\d{8}T\d{6}$/)
    expect(Number(ligne(ics, 'SEQUENCE:').slice(9))).toBeLessThanOrEqual(2147483647)
  })
})

describe('icsQuotidien — texte, échappement et pliage', () => {
  it('résumé en français, personnalisé par le prénom', () => {
    expect(ligne(icsQuotidien({ heure: 18, minute: 30, maintenant: MIDI }), 'SUMMARY:')).toBe(
      "SUMMARY:Yalla! — 5 minutes d'anglais et d'arabe"
    )
    expect(
      ligne(icsQuotidien({ heure: 18, minute: 30, prenom: 'Nour', maintenant: MIDI }), 'SUMMARY:')
    ).toBe("SUMMARY:Yalla Nour! — 5 minutes d'anglais et d'arabe")
  })

  it('échappe la virgule d’un prénom (sinon le calendrier coupe le titre)', () => {
    const ics = icsQuotidien({ heure: 18, minute: 30, prenom: 'Nour, Adam', maintenant: MIDI })
    expect(ligne(ics, 'SUMMARY:')).toBe(
      "SUMMARY:Yalla Nour\\, Adam! — 5 minutes d'anglais et d'arabe"
    )
    // la VALARM porte le même texte, échappé pareil
    expect(ics).toContain('Nour\\, Adam')
    expect(ics).not.toMatch(/SUMMARY:[^\r]*[^\\], /)
  })

  it('échappe aussi point-virgule et antislash', () => {
    const ics = icsQuotidien({ heure: 18, minute: 30, prenom: 'A;B\\C', maintenant: MIDI })
    expect(ligne(ics, 'SUMMARY:')).toContain('A\\;B\\\\C')
  })

  it('écrit les sauts de ligne en \\n littéral, pas en vrai retour', () => {
    const ics = icsQuotidien({ heure: 18, minute: 30, maintenant: MIDI })
    const desc = ligne(ics, 'DESCRIPTION:Ouvre')
    expect(desc).toContain('\\n')
    expect(desc).toContain(URL_APP)
  })

  it('plie les longues lignes sans couper un caractère accentué en deux', () => {
    const prenom = 'Marie-Ange Éléonore Bénédicte de la Tour d’Auvergne Montmorency'
    const ics = icsQuotidien({ heure: 18, minute: 30, prenom, maintenant: MIDI })
    // la ligne brute est bien pliée…
    expect(ics).toContain('\r\n ')
    for (const l of ics.split('\r\n')) expect(octets(l)).toBeLessThanOrEqual(75)
    // …et se recolle à l'identique
    expect(ligne(ics, 'SUMMARY:')).toBe(
      `SUMMARY:Yalla ${prenom}! — 5 minutes d'anglais et d'arabe`
    )
    expect(ics).not.toContain('�') // aucun caractère mutilé
  })
})

describe('icsQuotidien — identité de l’événement', () => {
  it('UID stable : même prénom → même UID, quelles que soient l’heure et la date', () => {
    const a = ligne(icsQuotidien({ heure: 18, minute: 30, prenom: 'Nour', maintenant: MIDI }), 'UID:')
    const b = ligne(icsQuotidien({ heure: 7, minute: 5, prenom: 'Nour', maintenant: SOIR }), 'UID:')
    expect(a).toBe(b)
    // stable ne veut pas dire identique pour tout le monde
    const c = ligne(icsQuotidien({ heure: 18, minute: 30, prenom: 'Adam', maintenant: MIDI }), 'UID:')
    expect(c).not.toBe(a)
    // ASCII pur, accents aplatis
    expect(
      ligne(icsQuotidien({ heure: 18, minute: 30, prenom: 'Léïla', maintenant: MIDI }), 'UID:')
    ).toBe('UID:yalla-rappel-leila@ecotrans69.github.io')
    expect(a).not.toMatch(/[^\x20-\x7e]/)
  })

  it('SEQUENCE croît d’une génération à l’autre (le ré-import écrase l’ancien)', () => {
    const s = (t: number) =>
      Number(ligne(icsQuotidien({ heure: 18, minute: 30, maintenant: t }), 'SEQUENCE:').slice(9))
    expect(s(MIDI + 600_000)).toBeGreaterThan(s(MIDI))
    expect(Number.isInteger(s(MIDI))).toBe(true)
  })

  it('même entrée → même sortie (fonction pure)', () => {
    const opts = { heure: 18, minute: 30, prenom: 'Nour', maintenant: MIDI }
    expect(icsQuotidien(opts)).toBe(icsQuotidien(opts))
  })

  it('marche sans `maintenant` (valeur par défaut = Date.now)', () => {
    expect(() => icsQuotidien({ heure: 18, minute: 30 })).not.toThrow()
    expect(icsQuotidien({ heure: 18, minute: 30 })).toContain('RRULE:FREQ=DAILY')
  })
})

describe('nomFichierIcs', () => {
  it('sans prénom', () => {
    expect(nomFichierIcs()).toBe('yalla-rappel.ics')
    expect(nomFichierIcs('')).toBe('yalla-rappel.ics')
    expect(nomFichierIcs('   ')).toBe('yalla-rappel.ics')
  })

  it('avec prénom : ASCII, minuscules, sans espace ni accent', () => {
    expect(nomFichierIcs('Nour')).toBe('yalla-rappel-nour.ics')
    expect(nomFichierIcs('Léïla Anne')).toBe('yalla-rappel-leila-anne.ics')
    expect(nomFichierIcs('Nour, Adam')).toBe('yalla-rappel-nour-adam.ics')
    // rien qui puisse casser un système de fichiers
    expect(nomFichierIcs('../../etc/passwd')).toBe('yalla-rappel-etc-passwd.ics')
    expect(nomFichierIcs('🎉')).toBe('yalla-rappel.ics')
  })

  it('un prénom très long ne laisse pas de tiret orphelin après la troncature', () => {
    // la coupe à 32 caractères tombait pile sur un tiret → « …abcdefghi-.ics »
    const long = 'Abcdefghij Abcdefghij Abcdefghi Zzz'
    expect(nomFichierIcs(long)).toBe('yalla-rappel-abcdefghij-abcdefghij-abcdefghi.ics')
    expect(nomFichierIcs(long)).not.toMatch(/-\.ics$/)
    expect(
      ligne(icsQuotidien({ heure: 18, minute: 30, prenom: long, maintenant: MIDI }), 'UID:')
    ).not.toMatch(/-@/)
  })
})

describe('icsDataUrl', () => {
  it('encapsule le .ics dans une URL de données réutilisable telle quelle', () => {
    const url = icsDataUrl({ heure: 18, minute: 30, prenom: 'Léïla', maintenant: MIDI })
    expect(url.startsWith('data:text/calendar;charset=utf-8,')).toBe(true)
    const contenu = decodeURIComponent(url.slice('data:text/calendar;charset=utf-8,'.length))
    expect(contenu).toBe(icsQuotidien({ heure: 18, minute: 30, prenom: 'Léïla', maintenant: MIDI }))
    expect(contenu).toContain('Léïla')
  })
})

// ============================================================================
// Planification
// ============================================================================

describe('prochainDeclenchement', () => {
  it('null si le rappel est désactivé', () => {
    expect(prochainDeclenchement({ actif: false, heure: 18, minute: 30 }, MIDI)).toBeNull()
    expect(prochainDeclenchement(PREFS_DEFAUT, MIDI)).toBeNull() // désactivé par défaut
  })

  it('aujourd’hui si l’heure n’est pas encore passée', () => {
    expect(prochainDeclenchement(PREFS, MIDI)).toBe(new Date(2026, 7, 15, 18, 30, 0, 0).getTime())
  })

  it('demain si l’heure est passée', () => {
    expect(prochainDeclenchement(PREFS, SOIR)).toBe(new Date(2026, 7, 16, 18, 30, 0, 0).getTime())
  })

  it('demain aussi quand on tombe pile à l’heure (pas de boucle sur l’instant présent)', () => {
    const pile = new Date(2026, 7, 15, 18, 30, 0, 0).getTime()
    expect(prochainDeclenchement(PREFS, pile)).toBe(new Date(2026, 7, 16, 18, 30, 0, 0).getTime())
    // une milliseconde avant, c'est encore aujourd'hui
    expect(prochainDeclenchement(PREFS, pile - 1)).toBe(pile)
  })

  it('passe au mois suivant sans effort', () => {
    const finDeMois = new Date(2026, 7, 31, 23, 0, 0, 0).getTime()
    expect(prochainDeclenchement(PREFS, finDeMois)).toBe(
      new Date(2026, 8, 1, 18, 30, 0, 0).getTime()
    )
  })

  it('minuit pile est un horaire valide', () => {
    expect(prochainDeclenchement({ actif: true, heure: 0, minute: 0 }, MIDI)).toBe(
      new Date(2026, 7, 16, 0, 0, 0, 0).getTime()
    )
  })

  it('ne renvoie jamais NaN sur des données abîmées', () => {
    expect(prochainDeclenchement(PREFS, Number.NaN)).toBeNull()
    const t = prochainDeclenchement({ actif: true, heure: Number.NaN, minute: 12 }, MIDI)
    expect(Number.isFinite(t)).toBe(true)
  })

  it('un horodatage FINI mais hors plage Date rend null, jamais NaN', () => {
    // 1e21 passe Number.isFinite mais `new Date(1e21)` est « Invalid Date » :
    // sans garde on renvoyait NaN, et setTimeout(fn, NaN) part à 0 ms → boucle.
    for (const ts of [1e21, -1e21, 8.64e15 + 1, Number.MAX_VALUE]) {
      expect(prochainDeclenchement(PREFS, ts)).toBeNull()
    }
    // la borne exacte de Date reste acceptée
    expect(prochainDeclenchement(PREFS, 8.64e15)).not.toBeNull()
  })
})

describe('delaiAvantRappel', () => {
  it('null si désactivé', () => {
    expect(delaiAvantRappel({ actif: false, heure: 18, minute: 30 }, MIDI)).toBeNull()
  })

  it('donne le délai en ms, prêt pour setTimeout', () => {
    expect(delaiAvantRappel(PREFS, MIDI)).toBe(6.5 * 3_600_000) // 12h00 → 18h30
  })

  it('null (et pas NaN) sur un horodatage hors plage — setTimeout(fn, NaN) vaut 0', () => {
    const d = delaiAvantRappel(PREFS, 1e21)
    expect(d).toBeNull()
    expect(Number.isNaN(d as unknown as number)).toBe(false)
  })

  it('jamais négatif, jamais au-delà de 24 h', () => {
    for (const h of [0, 6, 12, 18, 23]) {
      for (const m of [0, 30, 59]) {
        const d = delaiAvantRappel({ actif: true, heure: h, minute: m }, SOIR)
        expect(d).not.toBeNull()
        expect(d as number).toBeGreaterThan(0)
        expect(d as number).toBeLessThanOrEqual(24 * 3_600_000)
      }
    }
  })
})

describe('formaterHeure', () => {
  it('affiche sur deux chiffres', () => {
    expect(formaterHeure({ heure: 18, minute: 30 })).toBe('18:30')
    expect(formaterHeure({ heure: 7, minute: 5 })).toBe('07:05')
    expect(formaterHeure({ heure: 99, minute: 99 })).toBe('23:59')
  })
})

// ============================================================================
// Message du jour
// ============================================================================

describe('etatDuJour', () => {
  it('objectif atteint → on félicite et on ne dérange pas', () => {
    const e = etatDuJour({ xpAujourdhui: 20, objectif: 20, serie: 0, heure: 20 })
    expect(e.raison).toBe('objectif_atteint')
    expect(e.doitRappeler).toBe(false)
    expect(e.message).toContain('Bravo')
  })

  it('objectif dépassé compte aussi, et la série est mise en avant', () => {
    const e = etatDuJour({ xpAujourdhui: 140, objectif: 20, serie: 7, heure: 9 })
    expect(e.raison).toBe('objectif_atteint')
    expect(e.message).toContain('7 jours de suite')
  })

  it('série en danger : série en cours, objectif non fait, il est tard', () => {
    const e = etatDuJour({ xpAujourdhui: 10, objectif: 20, serie: 3, heure: HEURE_TARD })
    expect(e.raison).toBe('serie_en_danger')
    expect(e.doitRappeler).toBe(true)
    expect(e.message).toContain('3 jours')
  })

  it('série d’un seul jour : message au singulier', () => {
    const e = etatDuJour({ xpAujourdhui: 0, objectif: 20, serie: 1, heure: 22 })
    expect(e.raison).toBe('serie_en_danger')
    expect(e.message).toBe('Vite ! Une leçon pour garder ta série 🔥')
  })

  it('avant l’heure tardive, une série en cours n’est pas « en danger »', () => {
    const e = etatDuJour({ xpAujourdhui: 0, objectif: 20, serie: 3, heure: HEURE_TARD - 1 })
    expect(e.raison).toBe('rien_a_faire')
    expect(e.doitRappeler).toBe(false)
    expect(e.message).toContain('3 jours de suite')
    expect(e.message).toContain('20 XP')
  })

  it('aucune série et rien fait aujourd’hui → invitation à (re)démarrer', () => {
    const matin = etatDuJour({ xpAujourdhui: 0, objectif: 20, serie: 0, heure: 8 })
    expect(matin.raison).toBe('jamais_joue')
    expect(matin.doitRappeler).toBe(true)
    // même tard : sans série en cours, il n'y a rien à « perdre »
    const soir = etatDuJour({ xpAujourdhui: 0, objectif: 20, serie: 0, heure: 22 })
    expect(soir.raison).toBe('jamais_joue')
    expect(soir.message).toBe('Yalla ! Une leçon pour démarrer ta série 🌱')
  })

  it('a commencé sans finir, sans série → on n’insiste pas', () => {
    const e = etatDuJour({ xpAujourdhui: 10, objectif: 20, serie: 0, heure: 21 })
    expect(e.raison).toBe('rien_a_faire')
    expect(e.doitRappeler).toBe(false)
    expect(e.message).toBe("Plus que 10 XP pour ton objectif du jour. Yalla !")
  })

  it('objectif à 0 ou absurde : repli sur l’objectif par défaut, jamais « atteint » d’office', () => {
    expect(etatDuJour({ xpAujourdhui: 0, objectif: 0, serie: 0, heure: 9 }).raison).toBe(
      'jamais_joue'
    )
    expect(etatDuJour({ xpAujourdhui: 0, objectif: -5, serie: 2, heure: 9 }).raison).toBe(
      'rien_a_faire'
    )
    expect(etatDuJour({ xpAujourdhui: 25, objectif: 0, serie: 0, heure: 9 }).raison).toBe(
      'objectif_atteint'
    )
  })

  it('encaisse des valeurs abîmées sans jamais lever', () => {
    const e = etatDuJour({
      xpAujourdhui: Number.NaN,
      objectif: Number.NaN,
      serie: Number.NaN,
      heure: Number.NaN,
    })
    expect(e.raison).toBe('jamais_joue')
    expect(e.message).not.toContain('NaN')
    const f = etatDuJour({ xpAujourdhui: -50, objectif: 20, serie: -3, heure: 30 })
    expect(f.message).not.toContain('-')
  })

  it('les 4 raisons sont couvertes, et les messages restent courts', () => {
    const cas = [
      { xpAujourdhui: 20, objectif: 20, serie: 5, heure: 20 },
      { xpAujourdhui: 0, objectif: 20, serie: 365, heure: 23 },
      { xpAujourdhui: 0, objectif: 20, serie: 0, heure: 7 },
      { xpAujourdhui: 5, objectif: 200, serie: 4, heure: 10 },
    ]
    const raisons = cas.map((c) => etatDuJour(c).raison)
    expect(new Set(raisons).size).toBe(4)
    for (const c of cas) {
      const m = etatDuJour(c).message
      expect(m.length).toBeLessThanOrEqual(60)
      expect(m.trim()).toBe(m)
      expect(m.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// Notifications navigateur
// ============================================================================

class FauxNotification {
  static permission: NotificationPermission = 'granted'
  static creees: { titre: string; options?: NotificationOptions }[] = []
  static planterConstructeur = false
  static planterDemande = false
  /** 'promesse' = navigateurs modernes, 'callback' = vieux Safari */
  static styleDemande: 'promesse' | 'callback' = 'promesse'
  static reponseDemande: NotificationPermission = 'granted'

  static requestPermission(cb?: (p: NotificationPermission) => void): Promise<NotificationPermission> | undefined {
    if (FauxNotification.planterDemande) throw new TypeError('boum')
    if (FauxNotification.styleDemande === 'callback') {
      cb?.(FauxNotification.reponseDemande)
      return undefined // le vieux Safari ne renvoie rien
    }
    return Promise.resolve(FauxNotification.reponseDemande)
  }

  constructor(titre: string, options?: NotificationOptions) {
    if (FauxNotification.planterConstructeur) throw new TypeError('Illegal constructor')
    FauxNotification.creees.push({ titre, options })
  }
}

function installerNotification(permission: NotificationPermission) {
  FauxNotification.permission = permission
  FauxNotification.creees = []
  FauxNotification.planterConstructeur = false
  FauxNotification.planterDemande = false
  FauxNotification.styleDemande = 'promesse'
  FauxNotification.reponseDemande = 'granted'
  vi.stubGlobal('Notification', FauxNotification)
}

function poserServiceWorker(showNotification: () => void) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ showNotification }) },
  })
}

describe('notifications — API absente (cas par défaut de jsdom)', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('peutNotifier est false et ne lève pas', () => {
    expect('Notification' in window).toBe(false)
    expect(peutNotifier()).toBe(false)
  })

  it('demanderPermission répond false', async () => {
    await expect(demanderPermission()).resolves.toBe(false)
  })

  it('notifier reste silencieux sans lever', () => {
    expect(() => notifier('Yalla !', 'Ta leçon du jour')).not.toThrow()
  })
})

describe('notifications — permission refusée', () => {
  beforeEach(() => installerNotification('denied'))
  afterEach(() => vi.unstubAllGlobals())

  it('peutNotifier est false', () => {
    expect(peutNotifier()).toBe(false)
  })

  it('demanderPermission ne redemande pas (un refus est définitif côté page)', async () => {
    const espion = vi.spyOn(FauxNotification, 'requestPermission')
    await expect(demanderPermission()).resolves.toBe(false)
    expect(espion).not.toHaveBeenCalled()
    espion.mockRestore()
  })

  it('notifier n’affiche rien', () => {
    notifier('Yalla !', 'Ta leçon du jour')
    expect(FauxNotification.creees).toHaveLength(0)
  })
})

describe('notifications — permission accordée', () => {
  beforeEach(() => installerNotification('granted'))
  afterEach(() => vi.unstubAllGlobals())

  it('peutNotifier est true', () => {
    expect(peutNotifier()).toBe(true)
  })

  it('demanderPermission répond true sans redemander', async () => {
    const espion = vi.spyOn(FauxNotification, 'requestPermission')
    await expect(demanderPermission()).resolves.toBe(true)
    expect(espion).not.toHaveBeenCalled()
    espion.mockRestore()
  })

  it('notifier affiche le titre, le corps et un tag anti-empilement', () => {
    notifier('Yalla !', 'Ta leçon du jour')
    expect(FauxNotification.creees).toHaveLength(1)
    expect(FauxNotification.creees[0].titre).toBe('Yalla !')
    expect(FauxNotification.creees[0].options?.body).toBe('Ta leçon du jour')
    expect(FauxNotification.creees[0].options?.tag).toBeTruthy()
    expect(FauxNotification.creees[0].options?.lang).toBe('fr')
  })

  it('deux rappels partagent le même tag (le second remplace le premier)', () => {
    notifier('A', '1')
    notifier('B', '2')
    expect(FauxNotification.creees[0].options?.tag).toBe(FauxNotification.creees[1].options?.tag)
  })
})

describe('notifications — demande de permission', () => {
  beforeEach(() => installerNotification('default'))
  afterEach(() => vi.unstubAllGlobals())

  it('accepte la réponse d’une promesse (navigateurs modernes)', async () => {
    FauxNotification.reponseDemande = 'granted'
    await expect(demanderPermission()).resolves.toBe(true)
  })

  it('accepte la réponse d’un callback (vieux Safari, qui ne renvoie rien)', async () => {
    FauxNotification.styleDemande = 'callback'
    FauxNotification.reponseDemande = 'granted'
    await expect(demanderPermission()).resolves.toBe(true)
  })

  it('un refus rend false', async () => {
    FauxNotification.reponseDemande = 'denied'
    await expect(demanderPermission()).resolves.toBe(false)
  })

  it('une API qui explose rend false plutôt que de casser l’app', async () => {
    FauxNotification.planterDemande = true
    await expect(demanderPermission()).resolves.toBe(false)
  })
})

describe('notifications — Chrome Android interdit `new Notification()`', () => {
  beforeEach(() => installerNotification('granted'))
  afterEach(() => {
    vi.unstubAllGlobals()
    delete (navigator as unknown as Record<string, unknown>).serviceWorker
  })

  it('bascule sur le service worker quand le constructeur lève', async () => {
    const show = vi.fn()
    poserServiceWorker(show)
    FauxNotification.planterConstructeur = true

    expect(() => notifier('Yalla !', 'Ta leçon du jour')).not.toThrow()
    await new Promise((r) => setTimeout(r, 0))

    expect(show).toHaveBeenCalledTimes(1)
    expect(show).toHaveBeenCalledWith('Yalla !', expect.objectContaining({ body: 'Ta leçon du jour' }))
  })

  it('n’appelle PAS le service worker quand le constructeur marche (pas de doublon)', async () => {
    const show = vi.fn()
    poserServiceWorker(show)

    notifier('Yalla !', 'Ta leçon du jour')
    await new Promise((r) => setTimeout(r, 0))

    expect(FauxNotification.creees).toHaveLength(1)
    expect(show).not.toHaveBeenCalled()
  })

  it('sans service worker ni constructeur utilisable, échoue en silence', () => {
    FauxNotification.planterConstructeur = true
    expect(() => notifier('Yalla !', 'Ta leçon du jour')).not.toThrow()
    expect(FauxNotification.creees).toHaveLength(0)
  })
})
