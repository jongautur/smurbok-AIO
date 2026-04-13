import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common'
import { ApiSecurity, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { MileageLogsService } from './mileage-logs.service'
import { CreateMileageLogDto } from './dto/create-mileage-log.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PaginationDto } from '../common/dto/pagination.dto'

@ApiTags('mileage-logs')
@ApiSecurity('google-workspace')
@Controller()
export class MileageLogsController {
  constructor(private readonly mileageLogsService: MileageLogsService) {}

  @Get('vehicles/:vehicleId/mileage-logs')
  findAll(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.mileageLogsService.findAllForVehicle(vehicleId, user.id, pagination.page ?? 1, pagination.limit ?? 20)
  }

  @Post('vehicles/:vehicleId/mileage-logs')
  create(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateMileageLogDto,
  ) {
    return this.mileageLogsService.create(vehicleId, user.id, dto)
  }

  @Delete('mileage-logs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.mileageLogsService.remove(id, user.id)
  }

  @Post('mileage-logs/:id/undelete')
  undelete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.mileageLogsService.undelete(id, user.id)
  }
}
