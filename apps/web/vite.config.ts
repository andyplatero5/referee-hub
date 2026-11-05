import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // En local y en CI el navegador habla con el mismo origen y Vite reenvía /api a la API.
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET ?? 'http://localhost:3000', changeOrigin: true },
  };

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { port: 5173, proxy },
  };
});
