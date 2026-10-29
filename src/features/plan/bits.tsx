export function ExpandButton({ open, controls, label, onToggle }: { open: boolean; controls: string; label: string; onToggle(): void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
      className="w-6 rounded text-muted hover:bg-botanical"
    >
      <span aria-hidden className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
    </button>
  );
}
