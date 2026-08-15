/**
 * Fenek — la mascotte de Yalla!
 *
 * Un fennec (le renard du désert, emblème de l'Algérie). Dessiné entièrement en
 * SVG pour rester net à toutes les tailles et ne coûter aucun téléchargement.
 * Le corps ne change JAMAIS d'une humeur à l'autre : seuls le visage, les
 * oreilles et quelques accessoires bougent, pour qu'on reconnaisse toujours le
 * même personnage.
 */

export type MascotteHumeur = 'neutre' | 'content' | 'triste' | 'fete' | 'dodo' | 'curieux'

interface Props {
  humeur?: MascotteHumeur
  /** Largeur en px (la hauteur suit le ratio du dessin). */
  taille?: number
  /** Texte de la bulle de dialogue affichée à côté de Fenek. */
  bulle?: string
  className?: string
}

/**
 * Le viewBox fait autorité (jamais de px en dur), et il déborde de 9 unités
 * autour du dessin : les oreilles tournent avec l'humeur et le corps se
 * balance, sans cette marge les pointes seraient rognées.
 */
const VB_X = -9
const VB_Y = -9
const VB_L = 138
const VB_H = 142

/** Hauteur des yeux : remontée pour dégager le museau et agrandir le regard. */
const CY_OEIL = 55

/** Lu par les lecteurs d'écran : décrit l'humeur, en français simple. */
const DESCRIPTION: Record<MascotteHumeur, string> = {
  neutre: 'Fenek le fennec',
  content: 'Fenek le fennec, tout content',
  triste: 'Fenek le fennec, un peu triste',
  fete: 'Fenek le fennec, qui fait la fête',
  dodo: 'Fenek le fennec, qui dort',
  curieux: 'Fenek le fennec, curieux',
}

/**
 * Rotation des oreilles en degrés [gauche, droite].
 * Positif = sens horaire : l'oreille gauche se redresse, la droite retombe.
 * C'est le signal d'humeur le plus lisible en tout petit (48 px), bien avant
 * la bouche.
 */
const OREILLES: Record<MascotteHumeur, [number, number]> = {
  neutre: [0, 0],
  content: [6, -6],
  triste: [-20, 20],
  fete: [9, -9],
  dodo: [-14, 14],
  curieux: [12, 3],
}

/** Décalage de la pupille : le regard suffit à faire passer l'émotion. */
const REGARD: Record<MascotteHumeur, [number, number]> = {
  neutre: [0, 0],
  content: [0, -0.6],
  triste: [0, 2.2],
  fete: [0, 0],
  dodo: [0, 0],
  curieux: [1.6, -1.6],
}

/** Sourcils [gauche, droite] — null quand Fenek dort (visage détendu). */
const SOURCILS: Record<MascotteHumeur, [string, string] | null> = {
  neutre: ['M40 46 Q47 42.5 54 46', 'M80 46 Q73 42.5 66 46'],
  content: ['M40 44 Q47 39.5 54 44', 'M80 44 Q73 39.5 66 44'],
  fete: ['M40 44 Q47 39.5 54 44', 'M80 44 Q73 39.5 66 44'],
  triste: ['M40 49 Q47 43 55 43.5', 'M80 49 Q73 43 65 43.5'],
  curieux: ['M40 43.5 Q47 39 54 42', 'M80 47 Q73 44 66 46.5'],
  dodo: null,
}

const CSS = `
.fenek {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  /* Palette du personnage : regroupée ici pour rester modifiable d'un endroit.
     Ce sont les couleurs du pelage (illustration), pas des fonds ni du texte —
     Fenek garde la même robe en thème clair comme en thème sombre. */
  --fenek-sable: #f5c17c;
  --fenek-sable-ombre: #e2a75c;
  --fenek-creme: #fff7ea;
  --fenek-oreille: #ffb5a2;
  --fenek-trait: #a8672a;
  --fenek-nez: #4a2f1d;
  --fenek-oeil: #34241a;
  --fenek-bouche: #c05f56;
  --fenek-langue: #ff9d9d;
  --fenek-joue: #ff9b8a;
  --fenek-oeil-blanc: #fffdf8;
  --fenek-reflet: #ffffff;
}
.fenek-svg { display: block; color: var(--text); flex: none; }
.fenek-balance {
  transform-box: fill-box;
  transform-origin: 50% 94%;
  animation: fenek-balance 4.6s ease-in-out infinite;
}
@keyframes fenek-balance {
  0%, 100% { transform: rotate(-1.4deg); }
  50% { transform: rotate(1.4deg); }
}
.fenek-cligne {
  transform-box: fill-box;
  transform-origin: center;
  animation: fenek-cligne 5.4s ease-in-out infinite;
}
@keyframes fenek-cligne {
  0%, 91%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.08); }
}
.fenek-zzz {
  transform-box: fill-box;
  animation: fenek-zzz 3.2s ease-out infinite;
}
@keyframes fenek-zzz {
  0% { opacity: 0; transform: translateY(4px); }
  35% { opacity: 0.95; }
  100% { opacity: 0; transform: translateY(-9px); }
}
.fenek-bulle {
  position: relative;
  background: var(--card);
  border: 2px solid var(--border);
  color: var(--text);
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  max-width: 220px;
  min-width: 0;
  overflow-wrap: anywhere;
}
/* Petit triangle vers Fenek : deux triangles superposés pour garder la bordure. */
.fenek-bulle::before,
.fenek-bulle::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 0;
  height: 0;
  border-style: solid;
}
.fenek-bulle::before {
  left: -11px;
  margin-top: -9px;
  border-width: 9px 11px 9px 0;
  border-color: transparent var(--border) transparent transparent;
}
.fenek-bulle::after {
  left: -8px;
  margin-top: -7px;
  border-width: 7px 9px 7px 0;
  border-color: transparent var(--card) transparent transparent;
}
@media (prefers-reduced-motion: reduce) {
  .fenek-balance,
  .fenek-cligne,
  .fenek-zzz {
    animation: none;
  }
}
`

/**
 * Un œil rond, volontairement GRAND : c'est ce qui rend Fenek attachant.
 * Trois reflets (un gros, un petit, une étincelle) pour le regard « brillant ».
 */
function Oeil({ cx, dx, dy }: { cx: number; dx: number; dy: number }) {
  return (
    <g>
      <circle
        cx={cx}
        cy={CY_OEIL}
        r={10.2}
        fill="var(--fenek-oeil-blanc)"
        stroke="var(--fenek-trait)"
        strokeWidth={1.6}
      />
      <circle cx={cx + dx} cy={CY_OEIL + dy} r={7} fill="var(--fenek-oeil)" />
      <circle cx={cx + dx - 2.6} cy={CY_OEIL + dy - 2.8} r={2.9} fill="var(--fenek-reflet)" />
      <circle cx={cx + dx + 2.7} cy={CY_OEIL + dy + 3} r={1.3} fill="var(--fenek-reflet)" opacity={0.75} />
      <circle
        cx={cx + dx + 3.4}
        cy={CY_OEIL + dy - 3.6}
        r={0.9}
        fill="var(--fenek-reflet)"
        opacity={0.9}
      />
    </g>
  )
}

function Yeux({ humeur }: { humeur: MascotteHumeur }) {
  // Yeux plissés de joie : deux arcs vers le haut.
  if (humeur === 'fete') {
    return (
      <g fill="none" stroke="var(--fenek-oeil)" strokeWidth={3.6} strokeLinecap="round">
        <path d="M38 59 Q47 48 56 59" />
        <path d="M64 59 Q73 48 82 59" />
      </g>
    )
  }
  // Yeux fermés : deux arcs vers le bas.
  if (humeur === 'dodo') {
    return (
      <g fill="none" stroke="var(--fenek-oeil)" strokeWidth={3.6} strokeLinecap="round">
        <path d="M38 52 Q47 62 56 52" />
        <path d="M64 52 Q73 62 82 52" />
      </g>
    )
  }
  const [dx, dy] = REGARD[humeur]
  // Le clignement ne tourne que sur les yeux ouverts.
  return (
    <g className="fenek-cligne">
      <Oeil cx={47} dx={dx} dy={dy} />
      <Oeil cx={73} dx={dx} dy={dy} />
    </g>
  )
}

function Bouche({ humeur }: { humeur: MascotteHumeur }) {
  if (humeur === 'fete') {
    return (
      <g>
        <path d="M51 78.5 Q60 77 69 78.5 Q67.5 89 60 89 Q52.5 89 51 78.5 Z" fill="var(--fenek-bouche)" />
        <path d="M55.5 84.5 Q60 82 64.5 84.5 Q63.5 89 60 89 Q56.5 89 55.5 84.5 Z" fill="var(--fenek-langue)" />
      </g>
    )
  }
  if (humeur === 'dodo') {
    return (
      <g>
        <path
          d="M60 76.2 V78.6"
          fill="none"
          stroke="var(--fenek-nez)"
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <ellipse cx={60} cy={82} rx={3.4} ry={2.9} fill="var(--fenek-bouche)" />
      </g>
    )
  }
  // Content : vraie bouche ouverte avec la langue — beaucoup plus chaleureux
  // qu'un simple trait, et impossible à confondre avec « neutre ».
  if (humeur === 'content') {
    return (
      <g>
        <path
          d="M60 76.2 V79"
          fill="none"
          stroke="var(--fenek-nez)"
          strokeWidth={2.9}
          strokeLinecap="round"
        />
        <path
          d="M50 79.5 Q60 78.5 70 79.5 Q68 89.5 60 89.5 Q52 89.5 50 79.5 Z"
          fill="var(--fenek-bouche)"
        />
        <path
          d="M55 85.5 Q60 83.5 65 85.5 Q64 89.5 60 89.5 Q56 89.5 55 85.5 Z"
          fill="var(--fenek-langue)"
        />
      </g>
    )
  }
  const trait: Record<'neutre' | 'triste' | 'curieux', string> = {
    neutre: 'M51 80 Q60 87.5 69 80',
    triste: 'M53 85 Q60 79.5 67 85',
    curieux: 'M53 80 Q60 86.5 67 79.5',
  }
  return (
    <path
      d={`M60 76.2 V79 ${trait[humeur]}`}
      fill="none"
      stroke="var(--fenek-nez)"
      strokeWidth={2.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export function Mascotte({ humeur = 'neutre', taille = 120, bulle, className }: Props) {
  const [rotG, rotD] = OREILLES[humeur]
  const sourcils = SOURCILS[humeur]
  const hauteur = Math.round((taille * VB_H) / VB_L)
  // Fenek penche la tête quand il est curieux : la posture parle avant le visage.
  const inclinaison = humeur === 'curieux' ? 'rotate(-5 60 88)' : undefined

  return (
    <span className={className ? `fenek ${className}` : 'fenek'}>
      <style>{CSS}</style>
      <svg
        role="img"
        aria-label={DESCRIPTION[humeur]}
        className="fenek-svg"
        width={taille}
        height={hauteur}
        viewBox={`${VB_X} ${VB_Y} ${VB_L} ${VB_H}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="fenek-balance">
          {/* Silhouette : identique pour TOUTES les humeurs, c'est ce qui fait
              qu'on reconnaît Fenek d'un écran à l'autre. */}
          <g className="fenek-silhouette">
            {/* Queue touffue à bout crème, derrière le corps */}
            <g stroke="var(--fenek-trait)" strokeWidth={2} strokeLinejoin="round">
              <path
                d="M74 118 C102 124 118 106 111 88 C106 75 91 74 88 86 C86 95 98 96 98 104 C98 112 86 113 74 108 Z"
                fill="var(--fenek-sable)"
              />
              <path
                d="M111 88 C106 75 91 74 88 86 C86.5 91 90 94 93 95 C99 89 106 86 111 88 Z"
                fill="var(--fenek-creme)"
              />
            </g>

            {/* Corps + ventre crème */}
            <ellipse
              cx={60}
              cy={104}
              rx={24}
              ry={21}
              fill="var(--fenek-sable)"
              stroke="var(--fenek-trait)"
              strokeWidth={2}
            />
            <ellipse cx={60} cy={108} rx={16} ry={16} fill="var(--fenek-creme)" />
            {/* Touffe de poils sur le poitrail : trois vagues, ça adoucit tout */}
            <path
              d="M46 94 Q51 88 56 94 Q60 88 64 94 Q69 88 74 94 Q60 99 46 94 Z"
              fill="var(--fenek-creme)"
            />

            {/* Petites pattes */}
            <ellipse
              cx={48}
              cy={122}
              rx={8.6}
              ry={6}
              fill="var(--fenek-creme)"
              stroke="var(--fenek-trait)"
              strokeWidth={2}
            />
            <ellipse
              cx={72}
              cy={122}
              rx={8.6}
              ry={6}
              fill="var(--fenek-creme)"
              stroke="var(--fenek-trait)"
              strokeWidth={2}
            />
          </g>

          <g transform={inclinaison}>
            {/* Oreilles : immenses, c'est LA signature du fennec */}
            <g stroke="var(--fenek-trait)" strokeWidth={2} strokeLinejoin="round">
              <g transform={`rotate(${rotG} 48 47)`}>
                <path
                  d="M36 53 C20 42 8 26 11 6 C28 12 48 22 59 37 Z"
                  fill="var(--fenek-sable)"
                />
                <path
                  d="M39 49 C26 40 17 27 19 13 C32 19 47 28 55 38 Z"
                  fill="var(--fenek-oreille)"
                  strokeWidth={1.2}
                />
              </g>
              <g transform={`rotate(${rotD} 72 47)`}>
                <path
                  d="M84 53 C100 42 112 26 109 6 C92 12 72 22 61 37 Z"
                  fill="var(--fenek-sable)"
                />
                <path
                  d="M81 49 C94 40 103 27 101 13 C88 19 73 28 65 38 Z"
                  fill="var(--fenek-oreille)"
                  strokeWidth={1.2}
                />
              </g>
            </g>

            {/* Tête */}
            <ellipse
              cx={60}
              cy={60}
              rx={35}
              ry={31}
              fill="var(--fenek-sable)"
              stroke="var(--fenek-trait)"
              strokeWidth={2}
            />

            {/* Museau clair, fin, qui descend en pointe */}
            <path
              d="M60 62 C80 63.5 85 76 78 86 C71 94 49 94 42 86 C35 76 40 63.5 60 62 Z"
              fill="var(--fenek-creme)"
            />

            {/* Joues rosées, sous les moustaches */}
            <g fill="var(--fenek-joue)" opacity={0.55}>
              <ellipse cx={34} cy={71} rx={7.4} ry={5.4} />
              <ellipse cx={86} cy={71} rx={7.4} ry={5.4} />
            </g>

            {/* Moustaches */}
            <g
              stroke="var(--fenek-trait)"
              strokeWidth={1.3}
              strokeLinecap="round"
              opacity={0.55}
              fill="none"
            >
              <path d="M43 71 L25 66" />
              <path d="M43 74 L23 74" />
              <path d="M43 77 L26 82" />
              <path d="M77 71 L94 66" />
              <path d="M77 74 L95 73" />
              <path d="M77 77 L92 81" />
            </g>

            {/* Truffe */}
            <path
              d="M54 66.5 H66 C67.6 66.5 68.3 68.4 67.2 69.7 L61.6 75.6 C60.7 76.5 59.3 76.5 58.4 75.6 L52.8 69.7 C51.7 68.4 52.4 66.5 54 66.5 Z"
              fill="var(--fenek-nez)"
            />

            <Bouche humeur={humeur} />
            <Yeux humeur={humeur} />

            {sourcils && (
              <g
                fill="none"
                stroke="var(--fenek-trait)"
                strokeWidth={2.6}
                strokeLinecap="round"
                opacity={0.85}
              >
                <path d={sourcils[0]} />
                <path d={sourcils[1]} />
              </g>
            )}

            {/* Larme discrète */}
            {humeur === 'triste' && (
              <path
                d="M39 65 C42 69 42 71.5 39 73 C36 71.5 36 69 39 65 Z"
                fill="var(--blue)"
                opacity={0.9}
              />
            )}
          </g>
        </g>

        {/* Accessoires d'humeur : hors du balancement pour rester lisibles */}
        {humeur === 'dodo' && (
          <g className="fenek-zzz" fill="currentColor" opacity={0.75} fontWeight="800">
            <text x={62} y={30} fontSize={11}>
              z
            </text>
            <text x={71} y={21} fontSize={14}>
              z
            </text>
            <text x={83} y={11} fontSize={17}>
              z
            </text>
          </g>
        )}
        {humeur === 'curieux' && (
          <text
            x={64}
            y={26}
            textAnchor="middle"
            fontSize={20}
            fontWeight="800"
            fill="currentColor"
            opacity={0.75}
          >
            ?
          </text>
        )}
        {humeur === 'fete' && (
          <g>
            <circle cx={9} cy={68} r={3.2} fill="var(--gold)" />
            <rect x={13} y={88} width={6} height={6} rx={1.5} fill="var(--blue)" transform="rotate(18 16 91)" />
            <circle cx={112} cy={56} r={2.8} fill="var(--purple)" />
            <rect x={106} y={70} width={5.5} height={5.5} rx={1.5} fill="var(--red)" transform="rotate(-22 109 73)" />
            <circle cx={60} cy={16} r={2.6} fill="var(--gold)" />
          </g>
        )}
      </svg>
      {bulle ? <span className="fenek-bulle">{bulle}</span> : null}
    </span>
  )
}
