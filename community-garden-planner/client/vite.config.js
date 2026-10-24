import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' }
  },
  base: '/community-garden-planner/',
  // This project is a standalone Vite app. Configure base only if deploying under a repository subpath.
});
