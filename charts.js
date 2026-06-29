/* ============================================================
   charts.js — Graphiques SVG dessinés sans bibliothèque externe
   Dépend de : data.js (PASS, POS, PO_LABELS)
   ============================================================ */


/*
  Génère un graphique radar (toile d'araignée) en SVG pur.
  Chaque axe correspond à un PO (PO1 à PO11).
  La surface colorée représente les scores.

  Paramètres :
    series : [{values:[v1..v11], color, stroke, fill}]
    opts   : {w, h} — dimensions en pixels (défaut 340×320)
*/
function radarSVG(series, opts = {}) {
  const W = opts.w || 340, H = opts.h || 320;
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

  let g = '';

  /* Anneaux de référence à 25 %, 50 %, 75 %, 100 % */
  [25, 50, 75, 100].forEach(ring => {
    const p = POS.map((_, i) => pt(i, ring).join(',')).join(' ');
    const isPass = ring === PASS;
    /* L'anneau à 50 % est en rouge pointillé — c'est le seuil de réussite */
    g += `<polygon points="${p}" fill="none" stroke="${isPass ? 'var(--red)' : 'var(--line)'}" stroke-width="${isPass ? 1.4 : 1}" ${isPass ? 'stroke-dasharray="4 3"' : ''}/>`;
  });

  /* Axes (rayons depuis le centre) et labels PO1..PO11 */
  POS.forEach((po, i) => {
    const o = pt(i, max);
    g += `<line x1="${cx}" y1="${cy}" x2="${o[0]}" y2="${o[1]}" stroke="var(--line)" stroke-width="1"/>`;
    /* Positionnement du label légèrement au-delà du bord du radar */
    const lx = cx + Math.cos(ang(i)) * (R + 18);
    const ly = cy + Math.sin(ang(i)) * (R + 18);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : (lx > cx ? 'start' : 'end');
    g += `<text x="${lx}" y="${ly + 4}" text-anchor="${anchor}" font-size="10.5" fill="var(--ink-3)" font-family="var(--mono)">${po}</text>`;
  });

  /* Label "50%" sur l'anneau seuil (PO1, axe du haut) */
  const sp = pt(0, PASS);
  g += `<text x="${sp[0] + 4}" y="${sp[1] - 3}" font-size="9.5" fill="var(--red)">50%</text>`;

  /* Séries de données : polygone rempli + cercles aux sommets */
  series.forEach(s => {
    const p = s.values.map((v, i) => pt(i, Math.max(0, Math.min(100, v))).join(',')).join(' ');
    g += `<polygon points="${p}" fill="${s.color}" fill-opacity="${s.fill || 0.16}" stroke="${s.stroke}" stroke-width="2" stroke-linejoin="round"/>`;
    s.values.forEach((v, i) => {
      const c = pt(i, Math.max(0, Math.min(100, v)));
      g += `<circle cx="${c[0]}" cy="${c[1]}" r="2.4" fill="${s.stroke}"/>`;
    });
  });

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Radar PO attainment">${g}</svg>`;
}


/*
  Génère un graphique en barres verticales en SVG pur.
  Une barre par PO — les barres sous 50 % sont affichées en rouge.

  Paramètres :
    series : [{values:[v1..v11], color, stroke, muted}]
    opts   : {w, h} — dimensions en pixels (défaut 640×268)
*/
function barsSVG(series, opts = {}) {
  const W = opts.w || 640, H = opts.h || 268;
  const padL = 34, padR = 14, padT = 14, padB = 30; /* Marges internes */
  const n = POS.length, plotW = W - padL - padR, plotH = H - padT - padB, max = 100;

  /* Convertit une valeur (0-100) en coordonnée Y dans le repère SVG */
  const y = v => padT + plotH * (1 - v / max);

  let g = '';

  /* Grille horizontale + labels de l'axe Y */
  [0, 25, 50, 75, 100].forEach(v => {
    g += `<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>`;
    g += `<text x="${padL - 6}" y="${y(v) + 3.5}" text-anchor="end" font-size="9.5" fill="var(--ink-3)" font-family="var(--mono)">${v}</text>`;
  });

  /* Largeur de chaque barre selon le nombre de séries */
  const slot = plotW / n, ns = series.length, bw = Math.min(20, (slot * 0.62) / ns);

  /* Dessin des barres pour chaque PO */
  POS.forEach((po, i) => {
    const base = padL + slot * i + slot / 2; /* Centre du groupe de barres */
    series.forEach((s, k) => {
      const v   = Math.max(0, Math.min(100, s.values[i]));
      const x   = base - (ns * bw) / 2 + k * bw; /* Décalage pour les séries multiples */
      const under = v < PASS;
      /* Couleur : grisée si "muted" (comparaison), rouge si sous seuil, sinon couleur de la série */
      const col = s.muted ? 'var(--line-2)' : (under ? 'var(--red)' : s.color);
      g += `<rect x="${x}" y="${y(v)}" width="${bw - 2}" height="${plotH - (y(v) - padT)}" rx="2" fill="${col}" ${s.muted ? 'fill-opacity="0.55"' : ''}/>`;
    });
    /* Label "1".."11" sous chaque barre */
    g += `<text x="${base}" y="${H - padB + 15}" text-anchor="middle" font-size="9" fill="var(--ink-3)" font-family="var(--mono)">${i + 1}</text>`;
  });

  /* Ligne de seuil 50 % en pointillés rouges */
  g += `<line x1="${padL}" y1="${y(PASS)}" x2="${W - padR}" y2="${y(PASS)}" stroke="var(--red)" stroke-width="1.5" stroke-dasharray="5 3"/>`;
  g += `<text x="${W - padR}" y="${y(PASS) - 4}" text-anchor="end" font-size="9.5" fill="var(--red)">passing 50%</text>`;

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Cumulative PO attainment">${g}</svg>`;
}


/*
  Génère les chips PO pour un cours donné.
  Affiche uniquement les POs auxquels le cours contribue (coefficient > 0).
  w : tableau de 11 coefficients.
*/
function poChipsW(w) {
  return `<div class="po-chips">${
    POS.map((p, pi) =>
      w[pi] > 0
        ? `<span class="pochip on" title="${PO_LABELS[pi]} (coef ${w[pi]})">${p}${w[pi] !== 1 ? ' ·' + w[pi] : ''}</span>`
        : ''
    ).join("")
  }</div>`;
}
