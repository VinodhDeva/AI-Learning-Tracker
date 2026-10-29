import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test-utils';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { createSeed } from '../../lib/seed';
import { NO_FILTERS } from '../../lib/filter';
import { todayIso } from '../../lib/dates';

const go = (path: string) => window.history.pushState({}, '', path);

beforeEach(() => {
  useTracker.getState().replaceAll(createSeed());
  useUi.setState({ expanded: {}, openTaskId: null, toast: null, filters: NO_FILTERS });
});

describe('Journal', () => {
  it('saves an entry as you type and removes it when emptied', async () => {
    const user = userEvent.setup();
    go('/journal');
    await renderApp();
    const learned = screen.getByLabelText('What I learned');
    await user.type(learned, 'Broadcasting');
    expect(useTracker.getState().data.journal[todayIso()]?.whatILearned).toBe('Broadcasting');
    expect(screen.getByRole('article', { name: /Entry for/ })).toHaveTextContent('Broadcasting');
    await user.clear(learned);
    expect(useTracker.getState().data.journal[todayIso()]).toBeUndefined();
  });

  it('heatmap cell reflects logged hours and selects the date', async () => {
    const user = userEvent.setup();
    const { data, logHours } = useTracker.getState();
    logHours(Object.keys(data.tasks)[0]!, todayIso(), 2);
    go('/journal');
    await renderApp();
    const calendar = screen.getByRole('group', { name: 'Study days calendar' });
    const cell = within(calendar).getByRole('button', { name: /2h logged/ });
    await user.click(cell);
    expect(cell).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Projects', () => {
  it('adds a project, validates the GitHub URL and saves eval results', async () => {
    const user = userEvent.setup();
    go('/projects');
    await renderApp();
    expect(screen.getAllByRole('article')).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: '+ Add project' }));
    const card = screen.getByRole('article', { name: 'Project: New project' });
    const url = within(card).getByLabelText('GitHub URL');
    await user.type(url, 'not a url');
    expect(within(card).getByRole('alert')).toBeInTheDocument();
    await user.clear(url);
    await user.type(url, 'https://github.com/me/rag');
    expect(within(card).getByRole('link', { name: /Open repo/ })).toHaveAttribute('href', 'https://github.com/me/rag');
    await user.type(within(card).getByLabelText('Eval results'), 'faithfulness 0.91');
    const saved = Object.values(useTracker.getState().data.projects).find((p) => p.name === 'New project');
    expect(saved).toMatchObject({ githubUrl: 'https://github.com/me/rag', evalResults: 'faithfulness 0.91' });
  });
});
