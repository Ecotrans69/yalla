# Yalla! — Design validé

**Date** : 10/08/2026 · **Validé par** : Sofian · **Statut** : approuvé (design présenté et accepté)

App familiale type Duolingo pour apprendre **l'anglais**, **l'arabe littéraire (fosʷha, avec alphabet)** et **la darija algérienne**, sur téléphone et tablette (iPhone, iPad, Android). Vocal complet : écoute (synthèse vocale) + répétition au micro avec score.

## 1. Décisions structurantes (validées par Sofian)

| Question | Décision |
|---|---|
| Public | Toute la famille — multi-profils, mode enfant |
| Arabe | Les deux : littéraire (avec alphabet) ET darija (phonétique latine) |
| Appareils | Mélange iPhone/iPad/Android → multi-plateforme obligatoire |
| Techno | Web-app installable (PWA) d'abord, transformable en app native plus tard |
| Nom | **Yalla!** |

## 2. Choix techniques

- **PWA React 18 + TypeScript + Vite**, plugin `vite-plugin-pwa` : service worker qui précache tout → l'app marche **hors-ligne** une fois installée.
- **Hébergement : GitHub Pages** (repo public `Ecotrans69/yalla`, déploiement automatique par GitHub Actions). ⛔ Jamais le VPS (règle : VPS = PRO uniquement).
- **Aucun backend, aucun compte** : profils + progression en stockage local du navigateur (module `store/` isolé, remplaçable par du stockage natif plus tard pour la version Capacitor/Expo).
- **Routing par hash** (`#/lecon/3`) — compatible GitHub Pages.
- **Voix** :
  - Synthèse vocale (TTS) : `speechSynthesis` du téléphone — voix `en-US`/`en-GB` et `ar-SA` intégrées iOS/Android, marche hors-ligne. Bouton 🐢 = vitesse 0,6.
  - Reconnaissance micro (STT) : `webkitSpeechRecognition` quand disponible (Chrome Android, Safari iOS récent). Score par similarité de texte normalisé (diacritiques arabes ignorées). **Fallback** : si le micro/STT n'est pas dispo, l'exercice « répète » devient automatiquement un exercice d'écoute — jamais bloquant.
- Le projet vit dans `~/Projects/yalla` — **rien sur le Bureau** (règle zéro pollution).

## 3. Architecture (modules isolés)

```
src/
  content/   Cours en JSON (anglais.json, arabe.json, darija.json) + schéma TS
  engine/    Moteur pur TS : vérification réponses, normalisation (arabe inclus),
             score de similarité, répétition espacée (SRS), calcul XP/streak/cœurs
  speech/    Wrapper TTS + STT, détection de support, fallbacks
  store/     Profils + progression (stockage local), API typée
  ui/        Écrans React : profils, carte du parcours, leçon, exercices,
             résultats, classement famille, réglages
```

`engine/` ne touche ni au DOM ni au stockage → testable unitairement. `content/` est de la donnée pure → extensible sans toucher au code.

## 4. Les 3 parcours (contenu v1, généré par Claude en JSON)

1. **🇬🇧 Anglais** (depuis le français) : 8 unités thématiques (salutations/se présenter, famille, nourriture, chiffres & heure, maison & quotidien, voyage & transport, travail, sorties & météo) × 4 leçons.
2. **Arabe littéraire** : d'abord **l'alphabet** — 6 leçons (28 lettres, formes début/milieu/fin, voyelles courtes fatha/kasra/damma) — puis 6 unités de vocabulaire/phrases × 3 leçons, en écriture arabe + phonétique systématique.
3. **🇩🇿 Darija algérienne** : 6 unités × 3 leçons, phonétique latine, conversation famille de tous les jours.

Chaque item = { texte cible, traduction FR, phonétique (arabe), langue TTS, image/emoji, tag `kid` }.

## 5. Types d'exercices (tous les types Duolingo)

| Type | Description |
|---|---|
| `new_word` | Présentation d'un mot nouveau avec audio + image |
| `select_image` | QCM avec images (orienté enfants) |
| `translate_tiles` | Assembler la traduction avec des tuiles de mots |
| `match_pairs` | Associer 5 paires (FR ↔ langue) |
| `fill_blank` | Phrase à trou (QCM) |
| `listen_choose` | 🔊 Écoute → choisir ce qu'on a entendu |
| `listen_type` | 🔊 Écoute → écrire |
| `speak_repeat` | 🎤 Écoute → **répéter au micro** → score de prononciation |
| `letter_forms` | Arabe : reconnaître une lettre et ses formes selon la position |

Une leçon ≈ 12-15 exercices, mélange des types, les erreurs reviennent en fin de leçon.

## 6. Gamification

- **XP** : 10 par exercice réussi, bonus leçon sans faute. **Objectif quotidien** réglable (10/20/30/50 XP).
- **Streak** : série de jours consécutifs avec flamme (heure de FRANCE).
- **Cœurs** : 5 vies, −1 par erreur, +1 toutes les 4 h — **désactivés en mode enfant**.
- **Couronnes** : niveau 1→5 par unité (refaire l'unité la monte).
- **Badges** : première leçon, 7 jours de streak, 100 mots appris, alphabet terminé, etc.
- **Classement famille** : entre les profils du même appareil, XP de la semaine.
- **Révision espacée (SRS)** : chaque mot a une force 0→5 (type Leitner) ; les mots ratés reviennent plus souvent + session « Révision » dédiée.

## 7. Profils famille

- Multi-profils locaux par appareil : prénom, avatar emoji, mode enfant, langues actives.
- Mode enfant : pas de cœurs, phrases courtes, plus d'images, leçons taguées `kid`.
- **Export/Import JSON** de la progression (sauvegarde ou transfert manuel entre appareils — pas de sync cloud en v1).

## 8. Limites connues et gestion d'erreurs

- STT indisponible (vieux navigateur, hors-ligne) → bascule auto en exercice d'écoute + petit bandeau d'info.
- Voix arabe absente du téléphone (rare) → affichage phonétique renforcé + message expliquant comment installer la voix.
- Stockage local : bouton d'export pour sauvegarde (au cas où le navigateur purge les données).

## 9. Tests et vérification

- **Vitest** sur `engine/` : scoring, normalisation arabe, SRS, XP/streak/cœurs.
- Vérification navigateur (Browser pane) : parcours complet d'une leçon, responsive mobile + tablette, mode sombre.
- Contrôle PWA : installable, offline OK.

## 10. Déploiement

Repo public GitHub `Ecotrans69/yalla` → GitHub Pages via workflow Actions. URL partagée à la famille. La création du repo public et le déploiement ont été validés par Sofian dans ce design.

## 11. Hors périmètre v1 (v2 possible)

Sync cloud entre appareils · mascotte animée · stories · ligues mondiales · notifications push · publication App Store / Play Store (la base de code le permettra via Capacitor/Expo).
