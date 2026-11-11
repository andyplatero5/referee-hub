import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../../common/auth/roles.guard';
import { env } from '../../config';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenRepository } from './refresh-token.repository';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: env.JWT_ACCESS_TTL_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenRepository,
    // El orden importa: primero se autentica y después se comprueba el rol.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
