import { useState, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  /** Throw (e.g. a ZodError from the store) to reject the value. */
  onSave(value: string): void;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

/** Click or press Enter to edit. Enter (Cmd/Ctrl+Enter when multiline) saves, Escape cancels, blur saves. */
export function InlineEdit({ value, onSave, label, placeholder, multiline, className = '' }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    if (draft !== value) {
      try {
        onSave(draft);
      } catch {
        setError(`Invalid ${label.toLowerCase()}`);
        return;
      }
    }
    setDraft(null);
    setError(null);
  };
  const cancel = () => {
    setDraft(null);
    setError(null);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cancel();
    } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  };

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(value)}
        aria-label={`Edit ${label}: ${value || 'empty'}`}
        className={`rounded px-1 text-left hover:bg-tint/40 ${value ? '' : 'italic text-muted'} ${className}`}
      >
        {value || placeholder || `Add ${label.toLowerCase()}`}
      </button>
    );
  }

  const common = {
    autoFocus: true,
    value: draft,
    'aria-label': label,
    'aria-invalid': error ? true : undefined,
    placeholder,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown,
    className: `w-full rounded border bg-surface px-1 ${error ? 'border-danger' : 'border-accent'} ${className}`,
  };
  return (
    <span className="block w-full">
      {multiline ? <textarea rows={3} {...common} /> : <input {...common} />}
      {error && <span role="alert" className="block text-xs text-danger">{error}</span>}
    </span>
  );
}
