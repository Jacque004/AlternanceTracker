import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** CSP du SPA (GitHub Pages / preview). Vite HMR a besoin d’eval en dev : on n’injecte qu’en production. */
const FRONTEND_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://generativelanguage.googleapis.com",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

function cspMetaPlugin() {
  return {
    name: 'html-csp-meta',
    transformIndexHtml(html: string) {
      if (process.env.NODE_ENV !== 'production') return html;
      const tag = `    <meta http-equiv="Content-Security-Policy" content="${FRONTEND_CSP}" />\n`;
      return html.replace('<head>', `<head>\n${tag}`);
    },
  };
}

export default defineConfig({
  // Domaine custom GitHub Pages => site servi à la racine.
  base: '/',
  plugins: [react(), cspMetaPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});

