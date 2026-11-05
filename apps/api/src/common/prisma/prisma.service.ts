import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Prisma conecta de forma perezosa: la API arranca aunque la BD no responda
// y /health reporta el estado real en lugar de tumbar el proceso.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
