import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { UpdateLanguageDto } from './dto/update-language.dto';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /api/auth/me
   * Returns the current user's Postgres profile. Pure read — user
   * creation happens in the guard before this ever runs.
   */
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user);
  }

  /**
   * PATCH /api/auth/me/language
   * Lets the user switch their preferred UI language.
   */
  @Patch('me/language')
  updateLanguage(@CurrentUser() user: User, @Body() dto: UpdateLanguageDto) {
    return this.authService.updateLanguage(user, dto.language);
  }
}
