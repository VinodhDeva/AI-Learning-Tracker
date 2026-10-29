import { useEffect } from 'react';
import { useUi } from '../store/useUi';

export function ToastHost() {
  const toast = useUi((s) => s.toast);
  const showToast = useUi((s) => s.showToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => showToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast, showToast]);

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {toast && (
        <div className="flex items-center gap-4 rounded-lg bg-ink px-4 py-3 text-sm text-canvas shadow-lg">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              className="font-semibold text-botanical underline"
              onClick={() => {
                toast.action!.run();
                showToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
