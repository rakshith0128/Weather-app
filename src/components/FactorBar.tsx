interface Props {
  label: string;
  value: string;
  pct: number;
  color: string;
}

export default function FactorBar({ label, value, pct, color }: Props) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-dim">{label}</span>
        <span className="font-mono text-xs" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
    </div>
  );
}
