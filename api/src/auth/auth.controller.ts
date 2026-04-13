import { Body, Controller, Get, Patch, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';
import { LoginDto } from './dto/login.dto';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@ApiTags('auth')
@ApiSecurity('google-workspace')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Exchanges a Firebase ID token for a server-issued JWT stored as an
   * httpOnly cookie. Firebase is only contacted here, never again.
   */
  @Post('login')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.loginWithFirebase(dto.firebaseToken);
    res.cookie('access_token', token, COOKIE_OPTIONS);
    return user;
  }

  /**
   * POST /api/auth/logout
   * Clears the session cookie.
   */
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { ok: true };
  }

  /**
   * GET /api/auth/me
   * Returns the current user's profile.
   */
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user);
  }

  /**
   * PATCH /api/auth/me/language
   */
  @Patch('me/language')
  updateLanguage(@CurrentUser() user: User, @Body() dto: UpdateLanguageDto) {
    return this.authService.updateLanguage(user, dto.language);
  }

  @Patch('me/notifications')
  updateNotifications(@CurrentUser() user: User, @Body() dto: UpdateNotificationsDto) {
    return this.authService.updateNotifications(user, dto.emailNotifications);
  }
}
