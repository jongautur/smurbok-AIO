import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { MileageLogsService } from './mileage-logs.service'
import { CreateMileageLogDto } from './dto/create-mileage-log.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('mileage-logs')
@ApiBearerAuth()
@Controller()
export class MileageLogsController {
  constructor(private readonly mileageLogsService: MileageLogsService) {}

  @Get('vehicles/:vehicleId/mileage-logs')
  findAll(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.mileageLogsService.findAllForVehicle(vehicleId, user.id)
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
}
