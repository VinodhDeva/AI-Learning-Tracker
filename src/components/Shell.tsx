import { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useUi, type Theme } from '../store/useUi';
import { useTracker } from '../store/useTracker';
import { ToastHost } from './Toast';
import { useShortcuts } from './useShortcuts';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/plan', label: 'Plan' },
  { to: '/projects', label: 'Projects' },
  { to: '/journal', label: 'Journal' },
  { to: '/settings', label: 'Settings' },
];
const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_ICON: Record<Theme, string> = { system: '🖥️', light: '☀️', dark: '🌙' };

function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

export function Shell() {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const saveError = useTracker((s) => s.saveError);
  useApplyTheme(theme);
  useShortcuts();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="flex-1 font-semibold whitespace-nowrap sm:flex-none">AI Learning Tracker</span>
          <nav aria-label="Main" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end
                className={({ isActive }) =>
                  `shrink-0 rounded px-3 py-1.5 text-sm ${isActive ? 'bg-tint font-medium' : 'hover:bg-tint/40'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <span className="ml-auto hidden text-xs text-muted lg:inline">
            <Kbd>N</Kbd> new task · <Kbd>/</Kbd> search
          </span>
          <button
            className="rounded px-2 py-1 hover:bg-tint/40 sm:ml-auto lg:ml-0"
            onClick={() => setTheme(NEXT_THEME[theme])}
            aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}`}
            title={`Theme: ${theme}`}
          >
            {THEME_ICON[theme]}
          </button>
        </div>
      </header>
      {saveError && (
        <p role="alert" className="bg-danger px-4 py-2 text-center text-sm text-surface">
          Changes are not being saved: {saveError}. Export a backup from Settings.
        </p>
      )}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <ToastHost />
    </div>
  );
}

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded border border-line bg-canvas px-1 font-mono">{children}</kbd>
);
