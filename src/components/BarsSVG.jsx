/* ============================================================
   components/BarsSVG.jsx — Graphique en barres verticales en SVG
   Remplace la fonction barsSVG() de charts.js (version vanilla).

   Une barre par PO — les barres sous 50 % sont affichées en rouge.
   Supporte plusieurs séries (ex : année courante + année de comparaison).

   Props :
     series — tableau de séries : [{values:[v1..v11], color, stroke, muted}]
               muted=true  → barre grisée (utilisé pour la série de comparaison)
     width  — largeur SVG en pixels (défaut 640)
     height — hauteur SVG en pixels (défaut 268)
   ============================================================ */

import { POS, PASS } from '../data/index.js';

export default function BarsSVG({ series, width = 640, height = 268 }) {
  const W = width, H = height;
  /* Marges internes du graphique */
  const padL = 34, padR = 14, padT = 14, padB = 30;
  const n = POS.length, plotW = W - padL - padR, plotH = H - padT - padB, max = 100;

  /* Convertit une valeur (0-100) en coordonnée Y dans le repère SVG */
  const yCoord = v => padT + plotH * (1 - v / max);

  /* ---- Grille horizontale + labels de l'axe Y ---- */
  const gridLines = [0, 25, 50, 75, 100].map(v => (
    <g key={v}>
      <line x1={padL} y1={yCoord(v)} x2={W - padR} y2={yCoord(v)} stroke="var(--line)" strokeWidth={1} />
      <text x={padL - 6} y={yCoord(v) + 3.5} textAnchor="end" fontSize={9.5} fill="var(--ink-3)" fontFamily="var(--mono)">
        {v}
      </text>
    </g>
  ));

  /* Largeur de chaque barre, ajustée selon le nombre de séries */
  const slot = plotW / n;
  const ns   = series.length;
  const bw   = Math.min(20, (slot * 0.62) / ns);

  /* ---- Barres pour chaque PO ---- */
  const bars = POS.map((po, i) => {
    const base = padL + slot * i + slot / 2; /* Centre du groupe de barres pour ce PO */
    return (
      <g key={po}>
        {series.map((s, k) => {
          const v     = Math.max(0, Math.min(100, s.values[i]));
          const x     = base - (ns * bw) / 2 + k * bw; /* Décalage pour les séries multiples */
          const under = v < PASS;
          /* Couleur : grisée si "muted" (comparaison), rouge si sous seuil, sinon couleur de la série */
          const col   = s.muted ? 'var(--line-2)' : under ? 'var(--red)' : s.color;
          return (
            <rect
              key={k}
              x={x}
              y={yCoord(v)}
              width={bw - 2}
              height={plotH - (yCoord(v) - padT)}
              rx={2}
              fill={col}
              fillOpacity={s.muted ? 0.55 : 1}
            />
          );
        })}
        {/* Label numérique "1".."11" sous chaque barre */}
        <text x={base} y={H - padB + 15} textAnchor="middle" fontSize={9} fill="var(--ink-3)" fontFamily="var(--mono)">
          {i + 1}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cumulative PO attainment">
      {gridLines}
      {bars}
      {/* Ligne de seuil 50 % en pointillés rouges */}
      <line x1={padL} y1={yCoord(PASS)} x2={W - padR} y2={yCoord(PASS)} stroke="var(--red)" strokeWidth={1.5} strokeDasharray="5 3" />
      <text x={W - padR} y={yCoord(PASS) - 4} textAnchor="end" fontSize={9.5} fill="var(--red)">passing 50%</text>
    </svg>
  );
}
