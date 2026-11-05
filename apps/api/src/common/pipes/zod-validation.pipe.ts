import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

// Valida body, query o params con un esquema Zod. Un fallo es siempre 400 VALIDATION_ERROR.
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          issue: issue.message,
        })),
      });
    }
    return result.data;
  }
}
