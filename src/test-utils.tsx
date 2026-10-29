import { render, screen } from '@testing-library/react';
import App from './App';

/** Render the app at `path` and wait for the lazily loaded page heading. */
export async function renderApp(path?: string) {
  if (path) window.history.pushState({}, '', path);
  const result = render(<App />);
  await screen.findByRole('heading', { level: 1 });
  return result;
}
