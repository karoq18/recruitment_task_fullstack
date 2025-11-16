import React from "react";

export default function Sparkline({
  values = [],
  width = 260,
  height = 72,
  strokeWidth = 2.5,
}) {
  const nums = (Array.isArray(values) ? values : [])
    .map(v => Number(v))
    .filter(v => Number.isFinite(v));

  if (!nums.length) {
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Brak danych do wykresu"
      />
    );
  }

  const paddingLeft = 40;
  const paddingRight = 8;
  const paddingTop = 12;
  const paddingBottom = 14;
  const pointRadius = 4;

  const min = Math.min(...nums);
  const max = Math.max(...nums);

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const stepX = nums.length > 1 ? innerWidth / (nums.length - 1) : innerWidth;

  const span = max - min || 1;

  const paddedMin = min - span * 0.15;
  const paddedMax = max + span * 0.15;
  const paddedSpan = paddedMax - paddedMin;

  const yFor = v => {
    const ratio = (v - paddedMin) / paddedSpan;
    const y = paddingTop + (1 - ratio) * innerHeight;
    return y;
  };

  const points = nums.map((v, i) => {
    const x = paddingLeft + i * stepX;
    const y = yFor(v);
    return { x, y };
  });

  let linePath = "";
  points.forEach((p, i) => {
    linePath += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
  });

  const first = points[0];
  const last = points[points.length - 1];

  const baselineY = height - paddingBottom;
  const areaPath =
    `${linePath} ` +
    `L ${last.x} ${baselineY} ` +
    `L ${first.x} ${baselineY} Z`;

  const gradientId = "spark-grad";

  const midVal = (min + max) / 2;
  const yMid = yFor(midVal);
  const yMin = yFor(min);
  const yMax = yFor(max);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Wykres historii kursu sprzedaży"
      preserveAspectRatio="xMidYMid meet"
      className="sparkline"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      <line
        x1={paddingLeft}
        y1={paddingTop}
        x2={paddingLeft}
        y2={baselineY}
        stroke="rgba(148,163,184,0.5)"
        strokeWidth="0.8"
      />

      <line
        x1={paddingLeft}
        y1={baselineY}
        x2={width - paddingRight}
        y2={baselineY}
        stroke="rgba(148,163,184,0.4)"
        strokeWidth="0.8"
      />

      <line
        x1={paddingLeft}
        y1={yMax}
        x2={width - paddingRight}
        y2={yMax}
        stroke="rgba(148,163,184,0.18)"
        strokeWidth="0.6"
      />
      <line
        x1={paddingLeft}
        y1={yMid}
        x2={width - paddingRight}
        y2={yMid}
        stroke="rgba(148,163,184,0.16)"
        strokeWidth="0.6"
        strokeDasharray="3 3"
      />
      <line
        x1={paddingLeft}
        y1={yMin}
        x2={width - paddingRight}
        y2={yMin}
        stroke="rgba(148,163,184,0.18)"
        strokeWidth="0.6"
      />

      <text
        x={paddingLeft - 6}
        y={yMax + 6}
        textAnchor="end"
        fontSize="10"
        fill="rgba(148,163,184,0.95)"
      >
        {max.toFixed(4)}
      </text>
      <text
        x={paddingLeft - 6}
        y={yMin}
        textAnchor="end"
        fontSize="10"
        fill="rgba(148,163,184,0.95)"
      >
        {min.toFixed(4)}
      </text>

      <path d={areaPath} fill={`url(#${gradientId})`} />

      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx={last.x}
        cy={last.y}
        r={pointRadius}
        fill="currentColor"
        stroke="#fff"
        strokeWidth="1.5"
      />
    </svg>
  );
}
