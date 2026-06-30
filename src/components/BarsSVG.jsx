/* ============================================================
   components/BarsSVG.jsx — Graphique en barres verticales en SVG
   Supports plusieurs séries et labels personnalisés (POs ou cours).

   Props :
     series — [{values, color, stroke, muted, label}]
               muted=true → barre à sa propre couleur, opacité réduite,
               sans coloriage rouge sous le seuil (données historiques)
     labels  — optionnel : tableau de strings pour les labels X
               (défaut : numéros 1..n)
     rotateLabels — bool : incline les labels à 45° (utile pour les codes cours)
     width, height — dimensions SVG
   ============================================================ */

import { PASS } from '../data/index.js';

export default function BarsSVG({ series, labels, rotateLabels = false, width = 640, height = 268 }) {
  const W = width, H = height;
  const padL = 34, padR = 14, padT = 14, padB = rotateLabels ? 54 : 30;
  const n     = series.length > 0 ? series[0].values.length : (labels?.length ?? 11);
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const yCoord = v => padT + plotH * (1 - Math.max(0, Math.min(100, v)) / 100);

  /* Grille + labels axe Y */
  const gridLines = [0, 25, 50, 75, 100].map(v => (
    <g key={v}>
      <line x1={padL} y1={yCoord(v)} x2={W - padR} y2={yCoord(v)} stroke="var(--line)" strokeWidth={1} />
      <text x={padL - 6} y={yCoord(v) + 3.5} textAnchor="end" fontSize={9.5} fill="var(--ink-3)" fontFamily="var(--mono)">{v}</text>
    </g>
  ));

  const slot = plotW / Math.max(n, 1);
  const ns   = series.length;
  const bw   = Math.min(20, (slot * 0.62) / Math.max(ns, 1));

  const bars = Array.from({ length: n }, (_, i) => {
    const base = padL + slot * i + slot / 2;
    const xLabel = labels ? labels[i] : String(i + 1);

    return (
      <g key={i}>
        {series.map((s, k) => {
          const v     = Math.max(0, Math.min(100, s.values[i] ?? 0));
          const x     = base - (ns * bw) / 2 + k * bw;
          const under = v < PASS;
          /* Barres historiques (muted) : leur propre couleur sans rouge ; barres courantes : rouge si sous seuil */
          const col   = s.muted ? s.color : (under ? 'var(--red)' : s.color);
          return (
            <rect
              key={k}
              x={x}
              y={yCoord(v)}
              width={Math.max(bw - 2, 1)}
              height={Math.max(plotH - (yCoord(v) - padT), 0)}
              rx={2}
              fill={col}
              fillOpacity={s.muted ? 0.5 : 1}
            />
          );
        })}

        {/* Label axe X : droit ou incliné selon rotateLabels */}
        {rotateLabels ? (
          <text
            x={base}
            y={H - padB + 10}
            textAnchor="end"
            fontSize={9}
            fill="var(--ink-3)"
            fontFamily="var(--mono)"
            transform={`rotate(-40, ${base}, ${H - padB + 10})`}
          >
            {xLabel}
          </text>
        ) : (
          <text x={base} y={H - padB + 15} textAnchor="middle" fontSize={9} fill="var(--ink-3)" fontFamily="var(--mono)">
            {xLabel}
          </text>
        )}
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Attainment chart">
      {gridLines}
      {bars}
      <line x1={padL} y1={yCoord(PASS)} x2={W - padR} y2={yCoord(PASS)} stroke="var(--red)" strokeWidth={1.5} strokeDasharray="5 3" />
      <text x={W - padR} y={yCoord(PASS) - 4} textAnchor="end" fontSize={9.5} fill="var(--red)">passing 50%</text>
    </svg>
  );
}
