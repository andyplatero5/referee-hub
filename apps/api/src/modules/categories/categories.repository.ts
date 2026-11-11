import { Injectable } from '@nestjs/common';
import type { Category } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { level: 'asc' } });
  }

  findById(id: number): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }
}
