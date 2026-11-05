import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaModule } from './common/prisma/prisma.module';
import { env } from './config';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id'];
          const id = typeof incoming === 'string' && incoming ? incoming : randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },
        redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        autoLogging: { ignore: (req) => req.url === '/health' },
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
    PrismaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
