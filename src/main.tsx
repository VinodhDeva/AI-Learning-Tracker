import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTracker } from './store/useTracker';
import { repository } from './store/repository';
import './index.css';

await initTracker(repository);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
