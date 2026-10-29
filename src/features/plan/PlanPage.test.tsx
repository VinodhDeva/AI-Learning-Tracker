import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test-utils';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { createSeed } from '../../lib/seed';

const week1 = () => screen.getByRole('region', { name: /^Week 1:/ });

beforeEach(() => {
  useTracker.getState().replaceAll(createSeed()); // start date = this Monday, so week 1 is current and expanded
  useUi.setState({ expanded: {}, openTaskId: null, toast: null });
  window.history.pushState({}, '', '/plan');
});

describe('PlanPage', () => {
  it('renders seeded phases with the current week expanded', async () => {
    await renderApp();
    expect(screen.getByRole('region', { name: 'Phase: Foundations' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Phase: Side track' })).toBeInTheDocument();
    expect(within(week1()).getByRole('list', { name: /Tasks in Week 1/ })).toBeInTheDocument();
  });

  it('adds a task inline and rejects an empty title', async () => {
    const user = userEvent.setup();
    await renderApp();
    const input = within(week1()).getByLabelText('New task title');
    await user.type(input, '   {Enter}');
    expect(within(week1()).getByRole('alert')).toBeInTheDocument();
    await user.type(input, 'Read asyncio source{Enter}');
    expect(within(week1()).getByRole('button', { name: 'Read asyncio source' })).toBeInTheDocument();
  });

  it('marks a week done and undoes it from the toast', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(within(week1()).getByRole('button', { name: /Mark week done/ }));
    const boxes = within(week1()).getAllByRole('checkbox');
    expect(boxes.every((b) => (b as HTMLInputElement).checked)).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(within(week1()).getAllByRole('checkbox').some((b) => (b as HTMLInputElement).checked)).toBe(false);
  });

  it('edits a phase title inline; Escape cancels', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Edit Phase title: Foundations' }));
    await user.type(screen.getByLabelText('Phase title'), ' X{Escape}');
    expect(screen.getByRole('button', { name: 'Edit Phase title: Foundations' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit Phase title: Foundations' }));
    await user.type(screen.getByLabelText('Phase title'), ' 101{Enter}');
    expect(screen.getByRole('region', { name: 'Phase: Foundations 101' })).toBeInTheDocument();
  });

  it('opens the drawer and logs hours', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(within(week1()).getByRole('button', { name: 'NumPy quickstart' }));
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Hours worked'));
    await user.type(within(dialog).getByLabelText('Hours worked'), '1.5');
    await user.click(within(dialog).getByRole('button', { name: 'Log hours' }));
    expect(within(dialog).getByText(/1.5 spent/)).toBeInTheDocument();
    expect(Object.values(useTracker.getState().data.timeLogs)).toHaveLength(1);
  });
});
