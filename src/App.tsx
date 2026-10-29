import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Shell } from './components/Shell';
import { TaskDrawer } from './features/task-drawer/TaskDrawer';

// One chunk per page keeps the first load small.
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const PlanPage = lazy(() => import('./features/plan/PlanPage').then((m) => ({ default: m.PlanPage })));
const ProjectsPage = lazy(() => import('./features/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const JournalPage = lazy(() => import('./features/journal/JournalPage').then((m) => ({ default: m.JournalPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const page = (el: ReactNode) => (
  <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>{el}</Suspense>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={page(<DashboardPage />)} />
          <Route path="/plan" element={page(<PlanPage />)} />
          <Route path="/projects" element={page(<ProjectsPage />)} />
          <Route path="/journal" element={page(<JournalPage />)} />
          <Route path="/settings" element={page(<SettingsPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <TaskDrawer />
    </BrowserRouter>
  );
}
