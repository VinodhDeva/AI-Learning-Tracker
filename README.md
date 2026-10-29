# AI Engineer Learning Tracker

Todo app for a 16-week AI engineering plan. React + TypeScript + Vite + Tailwind, Zustand store, zod validation, localStorage persistence. An optional FastAPI server adds AI features.

## Running the app

### Prerequisites

- Node 20+ and npm
- [uv](https://docs.astral.sh/uv/) (Python package manager), only for the AI features
- An Anthropic API key with credits, only for the AI features

### First-time setup

Run these once from the project root:

```bash
npm install
cd server && uv sync && cp .env.example .env && cd ..
```

Then open `server/.env` and set `ANTHROPIC_API_KEY=sk-ant-...`. The file is git-ignored. If `ANTHROPIC_API_KEY` is already exported in your shell, that works too.

### Every time: start two servers

Use two separate terminal windows (or two Terminal panel tabs) and leave both running.

**Terminal 1, the app:**

```bash
npm run dev
```

Open the `Local:` URL it prints, normally http://localhost:5173.

**Terminal 2, the AI server** (skip it if you don't need the AI features):

```bash
cd server && uv run uvicorn app.main:app --port 8787 --reload
```

It is ready when it prints `Uvicorn running on http://127.0.0.1:8787`. To check it from another terminal:

```bash
curl http://127.0.0.1:8787/api/health
```

That should return `{"ok":true}`.

Stop either server with Ctrl+C in its terminal.

### Tests and builds

```bash
npx vitest run               # app tests once (`npm test` watches)
npm run typecheck
npm run build                # production build in dist/
cd server && uv run pytest   # AI server tests (no API key needed)
```

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Vite says `Port 5173 is in use` and moves to 5174 | Another dev server is still running. Stop the extra one with Ctrl+C, or use the URL Vite printed. |
| The plan looks reset, or data is missing | Data is saved per address, so `localhost:5173` and `localhost:5174` each have their own copy. Use the same URL every time. To move data, use Settings → Export JSON on one and Import JSON on the other. |
| AI buttons say "AI server is not running" | Terminal 2 isn't running. Start it, then check `curl http://127.0.0.1:8787/api/health`. |
| The uvicorn command exits right away with no output | It was run from somewhere that doesn't keep long-running programs alive, such as a one-off shell command in a chat tool. Run it in a normal terminal window and leave it open. |
| `Claude API error (400): Your credit balance is too low` | The API key works, but the account has no credits. Add credits under Plans & Billing in the Anthropic Console. |
| `Claude API key is missing or invalid` | Set `ANTHROPIC_API_KEY` in `server/.env` and restart Terminal 2. |
| `address already in use` on port 8787 | Another program is using 8787. Find it with `lsof -nP -iTCP:8787 -sTCP:LISTEN`, then stop it. Or use another port: change `8787` in `vite.config.ts` and in the uvicorn command, then restart both servers. Avoid port 8000; on this machine a Docker container already uses it. |

## Features

- **Dashboard** (`/`): overall progress, hours this week vs target, study streak, current week, upcoming and overdue tasks, phase progress.
- **Plan** (`/plan`): phases, weeks and tasks, all collapsible, inline-editable and drag-to-reorder (also by keyboard: Tab to the ⠿ handle, Space, arrows, Space). "Mark week done" with undo. Search and filters by phase, status, type, tag and overdue.
- **Task drawer**: status, type, priority, due date, estimate, move to another week, tags, markdown notes, resource checklist, hours log.
- **Projects** (`/projects`): GitHub link, status, eval results, screenshots (shrunk to under 200 KB each).
- **Journal** (`/journal`): daily entries that save as you type, plus a study-day calendar shaded by hours logged.
- **Settings** (`/settings`): weekly hour target, start date, theme, JSON export/import, reset to seed.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | New task in the current week (opens it) |
| `/` | Search tasks |
| `Esc` | Close the task drawer, cancel an inline edit |

### Dates

Week N runs from `startDate + (N-1)×7` days for 7 days. A task without its own due date is due at the end of its week, so changing the start date moves those due dates.

## AI features (optional)

Three features call Claude (`claude-opus-5-5`) through a small FastAPI server in `server/`, so your API key never reaches the browser:

- **Natural-language add** (Plan page): "finish RAG chunking tutorial by Sunday, 3 hrs" becomes a task draft you review, filed in the week of its due date.
- **Break into subtasks** (task drawer): suggested subtasks you pick from; kept ones are added right after the task.
- **Weekly review** (Dashboard): summarizes this week's journal, hours and tasks, and suggests next week's focus.

To run them, start the AI server alongside the app (see [Running the app](#running-the-app)). Vite forwards `/api` requests to port 8787. Everything else in the app works without the AI server. AI features work only with `npm run dev`: a production build has nothing forwarding `/api`.

Claude's answers are requested as JSON matching a schema, validated with pydantic on the server and zod in the browser. Requests use `fallbacks: "default"`, so a request Claude's safety filters decline is retried on a fallback model; if that also declines, the app shows a message.

## Data

All data is in this browser's localStorage (`ai-tracker:data`; view preferences in `ai-tracker:ui`). Export a JSON backup from Settings regularly. Clearing site data deletes everything.

If stored data fails validation on load, it is kept under `ai-tracker:data:corrupt:<timestamp>` and the seed plan loads instead.

## Structure

```
src/
  types/schema.ts      zod schemas; TS types are inferred from them
  store/useTracker.ts  all data + CRUD/reorder actions (the only way to change data)
  store/useUi.ts       view state: theme, expanded sections, filters, drawer, toast
  store/repository.ts  persistence boundary (LocalStorageRepository today)
  lib/                 seed plan, dates, progress/streak, filters, heatmap, backup, image downscaling
  components/          shared UI (inline edit, sortable lists, shell, toast)
  features/            one folder per page, plus the task drawer and AI components
  index.css            theme colors (light and dark) as CSS variables
server/
  app/main.py          FastAPI routes and prompts
  app/llm.py           Claude call with structured output and error mapping
  app/schemas.py       request/response models and JSON schemas
```

## Moving to a backend

State is normalized (`Record<id, Entity>` with foreign keys), so each entity maps to one table.
Implement `Repository` in `src/store/repository.ts` against a FastAPI + Postgres API and pass it to `initTracker` in `src/main.tsx`.
