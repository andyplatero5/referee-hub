import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { API_URL, BASE_URL } from './utils/env';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Regresión completa contra staging (o contra el entorno local).
    {
      name: 'staging',
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
    },
    // Producción: solo pruebas de lectura marcadas con @smoke. Nunca escribas datos aquí.
    {
      name: 'smoke-prod',
      grep: /@smoke/,
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
    },
  ],
  // Opcional: levanta la API y el frontend ya compilados (pnpm build) para correr todo en local o en CI.
  webServer: process.env.START_SERVERS
    ? [
        {
          command: 'pnpm --filter @referee-hub/api start',
          cwd: '..',
          url: `${API_URL}/api/docs-json`,
          reuseExistingServer: !isCI,
          timeout: 60_000,
        },
        {
          command: 'pnpm --filter @referee-hub/web preview',
          cwd: '..',
          url: BASE_URL,
          reuseExistingServer: !isCI,
          timeout: 60_000,
        },
      ]
    : undefined,
});
