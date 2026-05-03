import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common'
import { ApiSecurity, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { IsInt, Min, Max } from 'class-validator'
import type { User } from '@prisma/client'
import { StorageService } from './storage.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Admin } from '../auth/decorators/admin.decorator'

class SetTierDto {
  @IsInt() @Min(0) @Max(2)
  tier!: number
}

@ApiTags('storage')
@ApiSecurity('google-workspace')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get()
  @ApiOperation({ summary: 'Get your own storage usage' })
  getUsage(@CurrentUser() user: User) {
    return this.storageService.getUsage(user.id)
  }

  @Admin()
  @Get('admin/all')
  @ApiOperation({ summary: '[Admin] Overall storage usage across all users' })
  getAllUsage() {
    return this.storageService.getAllUsersUsage()
  }

  @Admin()
  @Get('admin/user/:userId')
  @ApiOperation({ summary: '[Admin] Storage usage for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  getUserUsage(@Param('userId') userId: string) {
    return this.storageService.getUsage(userId)
  }

  @Admin()
  @Patch('admin/user/:userId/tier')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Set tier for a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  setUserTier(@Param('userId') userId: string, @Body() dto: SetTierDto) {
    return this.storageService.setUserTier(userId, dto.tier)
  }
}
