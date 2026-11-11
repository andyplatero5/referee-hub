import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';

@Injectable()
export class CategoriesService {
  constructor(private readonly categories: CategoriesRepository) {}

  async list() {
    const categories = await this.categories.list();
    return { data: categories.map(({ id, name, level }) => ({ id, name, level })) };
  }
}
