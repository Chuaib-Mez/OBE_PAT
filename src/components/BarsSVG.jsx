import { POS, PASS } from '../data/index.js';

export default function BarsSVG({ series, width = 640, height = 268 }) {
  const W = width, H = height;
  const padL = 34, padR = 14, padT = 14, padB = 30;
  const n = POS.length, plotW = W - padL - padR, plotH = H - padT - padB, max = 100;

  const yCoord = v => padT + plotH * (1 - v / max);

  const gridLines = [0, 25, 50, 75, 100].map(v => (
    <g key={v}>
      <line x1={padL} y1={yCoord(v)} x2={W - padR} y2={yCoord(v)} stroke="var(--line)" strokeWidth={1} />
      <text x={padL - 6} y={yCoord(v) + 3.5} textAnchor="end" fontSize={9.5} fill="var(--ink-3)" fontFamily="var(--mono)">{v}</text>
    </g>
  ));

  const slot = plotW / n;
  const ns = series.length;
  const bw = Math.min(20, (slot * 0.62) / ns);

  const bars = POS.map((po, i) => {
    const base = padL + slot * i + slot / 2;
    return (
      <g key={po}>
        {series.map((s, k) => {
          const v = Math.max(0, Math.min(100, s.values[i]));
          const x = base - (ns * bw) / 2 + k * bw;
          const under = v < PASS;
          const col = s.muted ? 'var(--line-2)' : under ? 'var(--red)' : s.color;
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
        <text x={base} y={H - padB + 15} textAnchor="middle" fontSize={9} fill="var(--ink-3)" fontFamily="var(--mono)">{i + 1}</text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Cumulative PO attainment">
      {gridLines}
      {bars}
      <line x1={padL} y1={yCoord(PASS)} x2={W - padR} y2={yCoord(PASS)} stroke="var(--red)" strokeWidth={1.5} strokeDasharray="5 3" />
      <text x={W - padR} y={yCoord(PASS) - 4} textAnchor="end" fontSize={9.5} fill="var(--red)">passing 50%</text>
    </svg>
  );
}
