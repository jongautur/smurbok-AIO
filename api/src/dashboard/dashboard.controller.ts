import { Controller, Get } from '@nestjs/common'
import { ApiSecurity, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { DashboardService } from './dashboard.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('dashboard')
@ApiSecurity('google-workspace')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getSummary(@CurrentUser() user: User) {
    return this.dashboardService.getSummary(user.id)
  }
}
