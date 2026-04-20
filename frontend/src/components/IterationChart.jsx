export default function IterationChart({ iterations = [], method = 'NR' }) {
  const values = iterations.map((item) => item.maxMismatch ?? item.maxDelta ?? 0);
  const width = 500;
  const height = 180;
  const padding = 20;
  const max = Math.max(0.001, ...values);
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
    const y = height - padding - (value / max) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <div className="panel overflow-hidden">
      <div className="panel-header flex items-center justify-between">
        <span>Convergence Graph</span>
        <span className="text-xs normal-case tracking-normal text-slate-400">Gauss-Seidel</span>
      </div>
      <div className="p-4">
        {values.length === 0 ? (
          <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-400">
            Run a simulation to visualize convergence.
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full rounded-xl bg-slate-950/60">
            {[0.75, 0.5, 0.25, 0].map((fraction, index) => (
              <g key={index}>
                <line x1={padding} x2={width - padding} y1={padding + fraction * (height - padding * 2)} y2={padding + fraction * (height - padding * 2)} stroke="rgba(148,163,184,0.15)" strokeDasharray="4 4" />
                <text x="4" y={padding + fraction * (height - padding * 2) + 4} fill="#94a3b8" fontSize="9">
                  {(max * fraction).toFixed(3)}
                </text>
              </g>
            ))}
            <polyline fill="none" stroke="#22d3ee" strokeWidth="3" points={points.join(' ')} />
            {points.map((point, index) => {
              const [x, y] = point.split(',').map(Number);
              return <circle key={index} cx={x} cy={y} r="4" fill="#67e8f9" />;
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
