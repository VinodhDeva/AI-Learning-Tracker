import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTracker } from '../store/useTracker';
import { useUi } from '../store/useUi';
import { currentWeek } from '../lib/progress';
import { byOrder } from '../lib/select';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** N = new task in the current week (opens the drawer), / = focus task search. */
export function useShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('dialog[open]')) return;

      if (e.key === '/') {
        e.preventDefault();
        useUi.getState().setFocusSearch(true);
        navigate('/plan');
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const { data, addTask } = useTracker.getState();
        const week = currentWeek(data) ?? byOrder(Object.values(data.weeks))[0];
        if (!week) return;
        useUi.getState().openTask(addTask(week.id, { title: 'New task' }));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);
}
