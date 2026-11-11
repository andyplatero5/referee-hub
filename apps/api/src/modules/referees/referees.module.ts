import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { RefereesController } from './referees.controller';
import { RefereesRepository } from './referees.repository';
import { RefereesService } from './referees.service';

@Module({
  imports: [UsersModule, CategoriesModule, TeamsModule],
  controllers: [RefereesController],
  providers: [RefereesService, RefereesRepository],
  exports: [RefereesRepository],
})
export class RefereesModule {}
