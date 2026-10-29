import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test-utils';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { createSeed } from '../../lib/seed';
import { NO_FILTERS } from '../../lib/filter';
import { todayIso } from '../../lib/dates';

beforeEach(() => {
  useTracker.getState().replaceAll(createSeed());
  useUi.setState({ expanded: {}, openTaskId: null, toast: null, filters: NO_FILTERS });
  window.history.pushState({}, '', '/');
});

describe('Dashboard', () => {
  it('shows tiles from store data', async () => {
    const { data, logHours } = useTracker.getState();
    logHours(Object.keys(data.tasks)[0]!, todayIso(), 2.5);
    await renderApp();
    expect(within(screen.getByRole('region', { name: 'Hours this week' })).getByText('2.5h')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Study streak' })).getByText('1 day')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Current week' })).getByText('Week 1')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Overall complete' })).getByText('0%', { selector: 'p' })).toBeInTheDocument();
  });

  it('N creates a task in the current week and opens the drawer', async () => {
    const user = userEvent.setup();
    await renderApp();
    const before = Object.keys(useTracker.getState().data.tasks).length;
    await user.keyboard('n');
    expect(Object.keys(useTracker.getState().data.tasks)).toHaveLength(before + 1);
    expect(within(screen.getByRole('dialog')).getByLabelText('Task title')).toHaveValue('New task');
  });

  it('/ jumps to plan search and filtering shows results', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.keyboard('/');
    const search = await screen.findByLabelText('Search tasks');
    expect(search).toHaveFocus();
    await user.type(search, 'karpathy');
    expect(screen.getByRole('region', { name: 'Search results' })).toHaveTextContent('4 tasks match');
  });
});
