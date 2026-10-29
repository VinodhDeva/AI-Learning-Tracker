/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // AI features call the FastAPI server in server/ (uv run uvicorn app.main:app --port 8787).
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
  },
});
