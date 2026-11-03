const W = 96;
const H = 28;

/** Tiny grade trend line. Draws nothing (but keeps its space) with fewer than two points. */
export function Sparkline({ points }) {
  if (!points || points.length < 2) return <span className="fd-spark" aria-hidden="true" />;
  const min = Math.min(...points);
  const span = Math.max(...points) - min;
  const coords = points.map((p, i) => `${((i / (points.length - 1)) * W).toFixed(1)},${(span > 0 ? 2 + (1 - (p - min) / span) * (H - 4) : H / 2).toFixed(1)}`);
  return (
    <svg className="fd-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Grade trend">
      <polyline points={coords.join(" ")} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
