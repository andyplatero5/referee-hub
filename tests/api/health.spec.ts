import { expect, test } from '@playwright/test';
import { API_URL } from '../utils/env';

test.describe('GET /health', () => {
  // Las pruebas de API apuntan a la API, no al frontend.
  test.use({ baseURL: API_URL });

  test('responde 200 con el servicio y la base de datos arriba @smoke', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      status: 'ok',
      db: 'up',
      version: expect.any(String),
      uptime: expect.any(Number),
    });
  });

  test('incluye el header X-Request-Id para trazabilidad', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.headers()['x-request-id']).toBeTruthy();
  });
});
