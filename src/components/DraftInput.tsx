import { useEffect, useRef, useState } from 'react';
import { field } from './ui';

/** Keeps the typed text locally; `onChange` throws to reject a value, which shows an error without losing the draft. */
export function DraftInput({ label, value, onChange, type = 'text', className = '', selectOnFocus }: {
  label: string; value: string; onChange(v: string): void; type?: 'text' | 'number' | 'url'; className?: string; selectOnFocus?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  // Follow outside changes (import, reset, undo) unless the user is typing here.
  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setDraft(value);
      setError(null);
    }
  }, [value]);

  return (
    <span className="flex flex-col">
      <input
        ref={ref}
        type={type}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        className={`${field} ${className}`}
        value={draft}
        step={type === 'number' ? 0.5 : undefined}
        onFocus={selectOnFocus ? (e) => e.target.select() : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          try {
            onChange(e.target.value);
            setError(null);
          } catch {
            setError(`Invalid ${label.toLowerCase()}`);
          }
        }}
      />
      {error && <span role="alert" className="text-xs font-normal text-danger">{error}</span>}
    </span>
  );
}
