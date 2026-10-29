import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test-utils';
import { useTracker } from '../../store/useTracker';
import { useUi } from '../../store/useUi';
import { createSeed } from '../../lib/seed';
import { NO_FILTERS } from '../../lib/filter';
import { aiParseTask } from '../../lib/ai';
import { weekEnd } from '../../lib/dates';
import { weeklyReviewInput } from './WeeklyReviewCard';

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => {
  useTracker.getState().replaceAll(createSeed());
  useUi.setState({ toast: null, filters: NO_FILTERS, openTaskId: null, lastReview: null, expanded: {} });
});
afterEach(() => vi.restoreAllMocks());

describe('AI client', () => {
  it('shows the server message on errors and rejects malformed responses', async () => {
    respond(422, { detail: 'Claude declined this request. Try rephrasing it.' });
    await expect(aiParseTask('x', '2026-10-29')).rejects.toThrow('Claude declined');
    respond(200, { title: 'x' });
    await expect(aiParseTask('x', '2026-10-29')).rejects.toThrow('unexpected response');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(aiParseTask('x', '2026-10-29')).rejects.toThrow('uv run uvicorn');
  });
});

describe('Natural-language add', () => {
  it('drafts a task, files it in the week of its due date, and adds it', async () => {
    const user = userEvent.setup();
    const { startDate } = useTracker.getState().data.settings;
    const due = weekEnd(startDate, 2);
    const fetchMock = respond(200, {
      title: 'Finish RAG chunking tutorial', type: 'learn', priority: 'medium', dueDate: due, estimatedHours: 3, tags: ['rag'], notes: '',
    });
    await renderApp('/plan');
    await user.type(screen.getByLabelText('Describe a task'), 'finish RAG chunking tutorial by Sunday, 3 hrs');
    await user.click(screen.getByRole('button', { name: 'Draft task' }));
    const draft = await screen.findByRole('group', { name: 'Task draft' });
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toMatchObject({ text: 'finish RAG chunking tutorial by Sunday, 3 hrs' });
    await user.click(within(draft).getByRole('button', { name: 'Add task' }));

    const { data } = useTracker.getState();
    const task = Object.values(data.tasks).find((t) => t.title === 'Finish RAG chunking tutorial')!;
    expect(task).toMatchObject({ dueDate: due, estimatedHours: 3, tags: ['rag'] });
    expect(data.weeks[task.weekId]!.weekNumber).toBe(2);
    expect(screen.getByText(/^Added "Finish RAG chunking tutorial" to Week 2/)).toBeInTheDocument();
  });
});

describe('Subtasks', () => {
  it('adds kept subtasks right after the parent task', async () => {
    const user = userEvent.setup();
    respond(200, {
      subtasks: [
        { title: 'Read docs', type: 'learn', estimatedHours: 1 },
        { title: 'Skip me', type: 'practice', estimatedHours: 1 },
        { title: 'Write code', type: 'build', estimatedHours: 2 },
      ],
    });
    const { data } = useTracker.getState();
    const parent = Object.values(data.tasks).find((t) => t.title === 'NumPy quickstart')!;
    useUi.getState().openTask(parent.id);
    await renderApp('/plan');
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Break into subtasks/ }));
    await user.click(await within(dialog).findByLabelText('Keep subtask "Skip me"'));
    await user.click(within(dialog).getByRole('button', { name: 'Add 2 tasks' }));

    const titles = Object.values(useTracker.getState().data.tasks)
      .filter((t) => t.weekId === parent.weekId)
      .sort((a, b) => a.order - b.order)
      .map((t) => t.title);
    const i = titles.indexOf('NumPy quickstart');
    expect(titles.slice(i, i + 3)).toEqual(['NumPy quickstart', 'Read docs', 'Write code']);
    expect(titles).not.toContain('Skip me');
  });
});

describe('Weekly review', () => {
  it('sends this week only and shows the result', async () => {
    const user = userEvent.setup();
    const s = useTracker.getState();
    const week1 = Object.values(s.data.weeks).find((w) => w.weekNumber === 1)!;
    const { startDate } = s.data.settings;
    s.upsertJournal({ date: startDate, whatILearned: 'asyncio', blockers: '', nextSteps: '' });
    s.upsertJournal({ date: weekEnd(startDate, 2), whatILearned: 'later', blockers: '', nextSteps: '' });
    const input = weeklyReviewInput(useTracker.getState().data, week1);
    expect(input.journal.map((j) => j.whatILearned)).toEqual(['asyncio']);
    expect(input.nextWeek?.label).toMatch(/^Week 2/);

    respond(200, { summary: 'Good start.', wins: ['Set up FastAPI'], blockers: [], nextWeekFocus: ['scikit-learn pipelines'] });
    await renderApp('/');
    await user.click(screen.getByRole('button', { name: /Review my week/ }));
    const card = screen.getByRole('region', { name: 'Weekly review' });
    expect(await within(card).findByText('Good start.')).toBeInTheDocument();
    expect(within(card).getByText('scikit-learn pipelines')).toBeInTheDocument();
  });
});
