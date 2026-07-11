'use client';

import { useId } from 'react';

interface Props {
  score: number;
  color: string;
}

export default function RiskGauge({ score, color }: Props) {
  const gradId = useId();
  const clipId = useId();
  const h = 140;
  const fillH = Math.max(4, h * (score / 100));

  return (
    <svg width="70" height="170" viewBox="0 0 70 170" role="img" aria-label={`Risk score ${score} out of 100`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="20" y="10" width="30" height={h} rx="15" />
        </clipPath>
      </defs>
      <rect x="20" y="10" width="30" height={h} rx="15" fill="none" stroke="#24314F" strokeWidth="2" />
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="20"
          y={10 + h - fillH}
          width="30"
          height={fillH}
          fill={`url(#${gradId})`}
          style={{ transition: 'height 0.8s cubic-bezier(.4,0,.2,1), y 0.8s cubic-bezier(.4,0,.2,1)' }}
        />
      </g>
      {[0, 25, 50, 75, 100].map((t) => {
        const y = 10 + h - (h * t) / 100;
        return <line key={t} x1="14" y1={y} x2="20" y2={y} stroke="#93A1BF" strokeWidth="1" opacity="0.5" />;
      })}
      <text x="35" y="162" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="16" fontWeight="600" fill={color}>
        {score}
      </text>
    </svg>
  );
}
