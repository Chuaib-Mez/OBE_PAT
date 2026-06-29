import { POS, PASS } from '../data/index.js';

export default function RadarSVG({ series, width = 340, height = 320 }) {
  const W = width, H = height;
  const cx = W / 2, cy = H / 2 + 4;
  const R = Math.min(W, H) / 2 - 46;
  const n = POS.length, max = 100;

  const ang = i => (-90 + i * 360 / n) * Math.PI / 180;
  const pt = (i, r) => [
    cx + Math.cos(ang(i)) * R * (r / max),
    cy + Math.sin(ang(i)) * R * (r / max),
  ];

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

  const axes = POS.map((po, i) => {
    const o = pt(i, max);
    const lx = cx + Math.cos(ang(i)) * (R + 18);
    const ly = cy + Math.sin(ang(i)) * (R + 18);
    const anchor = Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end';
    return (
      <g key={po}>
        <line x1={cx} y1={cy} x2={o[0]} y2={o[1]} stroke="var(--line)" strokeWidth={1} />
        <text x={lx} y={ly + 4} textAnchor={anchor} fontSize={10.5} fill="var(--ink-3)" fontFamily="var(--mono)">{po}</text>
      </g>
    );
  });

  const sp = pt(0, PASS);

  const seriesElems = (series.length ? series : [{ values: POS.map(() => 0), color: 'transparent', stroke: 'transparent' }])
    .map((s, si) => {
      const points = s.values.map((v, i) => pt(i, Math.max(0, Math.min(100, v))).join(',')).join(' ');
      return (
        <g key={si}>
          <polygon
            points={points}
            fill={s.color}
            fillOpacity={s.fill ?? 0.16}
            stroke={s.stroke}
            strokeWidth={2}
            strokeLinejoin="round"
          />
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
