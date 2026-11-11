import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth.types';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { env } from '../../config';
import { AuthService } from './auth.service';
import { loginSchema, type LoginInput } from './auth.schemas';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  // 5 intentos por minuto por IP + correo (ver AppThrottlerGuard).
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Inicia sesión' })
  @ApiBody({ schema: z.toJSONSchema(loginSchema, { io: 'input' }) as object })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.auth.login(body.email, body.password);
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renueva el access token con la cookie de refresh' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.auth.refresh(readRefreshCookie(req));
    this.setRefreshCookie(res, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cierra la sesión y revoca el refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Usuario autenticado' })
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      ...refreshCookieOptions(),
      maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    });
  }
}

const readRefreshCookie = (req: Request): string | undefined => {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
};
