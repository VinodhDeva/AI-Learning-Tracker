export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-botanical"
      >
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted">{pct}%</span>
    </div>
  );
}
