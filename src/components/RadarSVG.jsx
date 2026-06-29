/* ============================================================
   components/RadarSVG.jsx — Graphique radar (toile d'araignée) en SVG
   Remplace la fonction radarSVG() de charts.js (version vanilla).

   Chaque axe correspond à un PO (PO1 à PO11).
   La surface colorée représente les scores d'une série.

   Props :
     series  — tableau de séries : [{values:[v1..v11], color, stroke, fill}]
     width   — largeur SVG en pixels (défaut 340)
     height  — hauteur SVG en pixels (défaut 320)
   ============================================================ */

import { POS, PASS } from '../data/index.js';

export default function RadarSVG({ series, width = 340, height = 320 }) {
  const W = width, H = height;
  const cx = W / 2, cy = H / 2 + 4;       /* Centre géométrique du radar */
  const R  = Math.min(W, H) / 2 - 46;     /* Rayon utile (marge pour les labels) */
  const n  = POS.length, max = 100;

  /* Angle de l'axe i : part de -90° (haut) et tourne dans le sens horaire */
  const ang = i => (-90 + i * 360 / n) * Math.PI / 180;

  /* Coordonnées cartésiennes du point à la valeur r sur l'axe i */
  const pt = (i, r) => [
    cx + Math.cos(ang(i)) * R * (r / max),
    cy + Math.sin(ang(i)) * R * (r / max),
  ];

  /* ---- Anneaux de référence à 25 %, 50 %, 75 %, 100 % ---- */
  /* L'anneau à 50 % est en rouge pointillé — c'est le seuil de réussite */
  const rings = [25, 50, 75, 100].map(ring => {
    const points = POS.map((_, i) => pt(i, ring).join(',')).join(' ');
    const isPass = ring === PASS;
    return (
      <polygon
        key={ring}
        points={points}
        fill="none"
        stroke={isPass ? 'var(--red)' : 'var(--line)'}
        strokeWidth={isPass ? 1.4 : 1}
        strokeDasharray={isPass ? '4 3' : undefined}
      />
    );
  });

  /* ---- Axes (rayons) et labels PO1..PO11 ---- */
  const axes = POS.map((po, i) => {
    const o  = pt(i, max);
    /* Positionnement du label légèrement au-delà du bord du radar */
    const lx = cx + Math.cos(ang(i)) * (R + 18);
    const ly = cy + Math.sin(ang(i)) * (R + 18);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    return (
      <g key={po}>
        <line x1={cx} y1={cy} x2={o[0]} y2={o[1]} stroke="var(--line)" strokeWidth={1} />
        <text x={lx} y={ly + 4} textAnchor={anchor} fontSize={10.5} fill="var(--ink-3)" fontFamily="var(--mono)">
          {po}
        </text>
      </g>
    );
  });

  /* Label "50%" positionné sur le premier axe (PO1, en haut) */
  const sp = pt(0, PASS);

  /* ---- Séries de données ---- */
  /* Si aucune série n'est fournie, on dessine un polygone transparent (structure visible) */
  const activeSeries = series.length
    ? series
    : [{ values: POS.map(() => 0), color: 'transparent', stroke: 'transparent' }];

  const seriesElems = activeSeries.map((s, si) => {
    /* Convertit les valeurs en points SVG, bornés entre 0 et 100 */
    const points = s.values.map((v, i) => pt(i, Math.max(0, Math.min(100, v))).join(',')).join(' ');
    return (
      <g key={si}>
        {/* Polygone rempli représentant les scores */}
        <polygon
          points={points}
          fill={s.color}
          fillOpacity={s.fill ?? 0.16}
          stroke={s.stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Cercles aux sommets (un par PO) */}
        {s.values.map((v, i) => {
          const c = pt(i, Math.max(0, Math.min(100, v)));
          return <circle key={i} cx={c[0]} cy={c[1]} r={2.4} fill={s.stroke} />;
        })}
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Radar PO attainment">
      {rings}
      {axes}
      <text x={sp[0] + 4} y={sp[1] - 3} fontSize={9.5} fill="var(--red)">50%</text>
      {seriesElems}
    </svg>
  );
}
