export function LoadingSpinner({ msg }: { msg: string }) {
  return (
    <p className="text-dim text-sm flex items-center gap-2">
      <span className="spin inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full" />
      {msg}
    </p>
  );
}

export function ErrorMessage({ error, prefix }: { error: string; prefix?: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-danger">
      <span className="mt-0.5">⚠️</span>
      <div>{prefix ? `${prefix} ` : ''}{error}</div>
    </div>
  );
}

export function Badge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ background: bg, color }}
    >
      {children}
    </span>
  );
}
