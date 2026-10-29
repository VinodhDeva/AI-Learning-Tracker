import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test-utils';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { createSeed } from '../../lib/seed';
import { exportJson } from '../../lib/backup';
import { NO_FILTERS } from '../../lib/filter';

const jsonFile = (text: string, name = 'backup.json') => new File([text], name, { type: 'application/json' });

beforeEach(() => {
  useTracker.getState().replaceAll(createSeed(new Date(2026, 0, 5)));
  useUi.setState({ toast: null, filters: NO_FILTERS, openTaskId: null });
});
afterEach(() => vi.restoreAllMocks());

describe('Settings', () => {
  it('updates the weekly target and start date', async () => {
    const user = userEvent.setup();
    await renderApp('/settings');
    const target = screen.getByLabelText('Weekly hour target');
    await user.clear(target);
    await user.type(target, '12');
    expect(useTracker.getState().data.settings.weeklyHourTarget).toBe(12);
    await user.clear(target);
    await user.type(target, '200');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(useTracker.getState().data.settings.weeklyHourTarget).toBe(20); // last valid prefix "20"
  });

  it('exports the data as a JSON download', async () => {
    const user = userEvent.setup();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:x'));
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await renderApp('/settings');
    await user.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(click).toHaveBeenCalled();
    expect(JSON.parse(await blobs[0]!.text())).toEqual(useTracker.getState().data);
  });

  it('imports a valid backup after confirming, with undo', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const backup = createSeed(new Date(2026, 5, 1));
    backup.settings.weeklyHourTarget = 7;
    await renderApp('/settings');
    const before = useTracker.getState().data;
    await user.upload(screen.getByLabelText('Import backup file'), jsonFile(exportJson(backup)));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(useTracker.getState().data.settings).toEqual(backup.settings);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useTracker.getState().data).toEqual(before);
  });

  it('rejects an invalid backup without touching data', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const confirm = vi.spyOn(window, 'confirm');
    await renderApp('/settings');
    const before = useTracker.getState().data;
    await user.upload(screen.getByLabelText('Import backup file'), jsonFile('{"version":1}'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid backup');
    expect(confirm).not.toHaveBeenCalled();
    expect(useTracker.getState().data).toBe(before);
  });

  it('resets to seed only after confirming', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    useTracker.getState().updateSettings({ weeklyHourTarget: 33 });
    await renderApp('/settings');
    await user.click(screen.getByRole('button', { name: 'Reset to seed data' }));
    expect(useTracker.getState().data.settings.weeklyHourTarget).toBe(33);
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Reset to seed data' }));
    expect(useTracker.getState().data.settings.weeklyHourTarget).toBe(10);
  });
});
