// Lightweight SVG charts (no chart library).

type Point = { label: string; value: number };

export function Sparkline({ values, color = '#FF5A36', width = 120, height = 36 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 4) + 2, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={`${d} L${width - 2} ${height} L2 ${height} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

export function LineChart({ points, color = '#FF5A36', format = (v: number) => String(v), height = 220 }: { points: Point[]; color?: string; format?: (v: number) => string; height?: number }) {
  if (points.length === 0) return null;
  const W = 640;
  const H = height;
  const pad = { l: 8, r: 8, t: 16, b: 28 };
  const vals = points.map((p) => p.value);
  const max = Math.max(...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const every = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg className="pt-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Trend chart">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} stroke="#E4DCCB" strokeDasharray="4 6" />
      ))}
      {points.length > 1 && <path d={`${d} L${x(points.length - 1)} ${H - pad.b} L${x(0)} ${H - pad.b} Z`} fill={color} opacity="0.1" />}
      {points.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" fill="#FFFCF6" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke">
            <title>{`${p.label}: ${format(p.value)}`}</title>
          </circle>
          {i % every === 0 || i === points.length - 1 ? (
            <text x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="12" fill="#7B7266">{p.label}</text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

export function Progress({ value, tone = 'tomato' }: { value: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="pt-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span className={`tone-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
