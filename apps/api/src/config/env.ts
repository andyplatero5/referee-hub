import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32, 'debe tener al menos 32 caracteres'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
    // Por defecto la cookie de refresh es Secure solo en producción.
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    APP_VERSION: z.string().optional(),
    RENDER_GIT_COMMIT: z.string().optional(),
  })
  .refine(
    (value) =>
      value.NODE_ENV !== 'production' || !value.JWT_ACCESS_SECRET.startsWith('cambia-esto'),
    {
      path: ['JWT_ACCESS_SECRET'],
      message: 'no uses el valor de ejemplo en producción',
    },
  )
  .transform((value) => ({
    ...value,
    COOKIE_SECURE: value.COOKIE_SECURE
      ? value.COOKIE_SECURE === 'true'
      : value.NODE_ENV === 'production',
  }));

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Variables de entorno inválidas: ${problems}`);
  }
  return result.data;
}
