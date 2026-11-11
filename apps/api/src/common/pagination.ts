import { z } from 'zod';

// Parámetros de paginación compartidos: ?page=1&pageSize=20 (máximo 100).
export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const pageMeta = (page: number, pageSize: number, total: number): PageMeta => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});

export const skipFor = (page: number, pageSize: number): number => (page - 1) * pageSize;
