import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Query, Res } from '@nestjs/common';
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
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { ExchangeMagicLinkDto } from './dto/exchange-magic-link.dto';

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
    // Cookie for web clients; token in body for mobile (expo-secure-store)
    res.cookie('access_token', token, COOKIE_OPTIONS);
    return { ...user, token };
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

  @Patch('me/currency')
  updateCurrency(@CurrentUser() user: User, @Body('currency') currency: string) {
    return this.authService.updateCurrency(user, currency);
  }

  @Post('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  registerPushToken(@CurrentUser() user: User, @Body() dto: RegisterPushTokenDto) {
    return this.authService.registerPushToken(user, dto.token);
  }

  @Delete('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  unregisterPushToken(@CurrentUser() user: User) {
    return this.authService.unregisterPushToken(user);
  }

  /**
   * GET /api/auth/me/export
   * Streams a ZIP containing all user data as JSON + original document files.
   */
  @Get('me/export')
  exportData(@CurrentUser() user: User, @Res() res: Response) {
    return this.authService.exportUserData(user.id, res);
  }

  /**
   * DELETE /api/auth/me
   * Hard-deletes the user account and all owned data.
   * Clears the session cookie before responding.
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.deleteAccount(user.id);
    res.clearCookie('access_token');
  }

  // ── Magic link ─────────────────────────────────────────────────────────────

  /**
   * POST /api/auth/magic-link
   * Request a magic link email. sessionId is a client-generated UUID used for polling.
   */
  @Post('magic-link')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestMagicLink(@Body() dto: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(dto.email, dto.sessionId);
  }

  /**
   * GET /api/auth/magic-link/verify?token=...
   * Browser follows the link from email; marks token used and stores JWT on the session record.
   * Redirects to a confirmation page.
   */
  @Get('magic-link/verify')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyMagicLink(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const webUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
    try {
      const { jwt } = await this.authService.verifyMagicLink(token);
      res.cookie('access_token', jwt, COOKIE_OPTIONS);
      res.redirect(`${webUrl}/vehicles`);
    } catch {
      res.redirect(`${webUrl}/magic-link/error`);
    }
  }

  /**
   * POST /api/auth/magic-link/exchange
   * Web client calls this after polling confirms status === 'verified'.
   * Exchanges the verified session for an httpOnly cookie (web auth).
   * Deletes the session record — single use.
   */
  @Post('magic-link/exchange')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async exchangeMagicLink(
    @Body() dto: ExchangeMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.authService.exchangeMagicLinkSession(dto.sessionId);
    res.cookie('access_token', token, COOKIE_OPTIONS);
    return { ...user, token };
  }

  /**
   * GET /api/auth/magic-link/status?sessionId=...
   * App polls this until status === 'verified', then exchanges the session for a cookie.
   */
  @Get('magic-link/status')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  pollMagicLink(@Query('sessionId') sessionId: string) {
    return this.authService.pollMagicLink(sessionId);
  }

}
