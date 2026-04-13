import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common'
import { ApiSecurity, ApiTags, ApiOperation } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { TripLogsService } from './trip-logs.service'
import { CreateTripLogDto } from './dto/create-trip-log.dto'
import { UpdateTripLogDto } from './dto/update-trip-log.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PaginationDto } from '../common/dto/pagination.dto'

@ApiTags('trip-logs')
@ApiSecurity('google-workspace')
@Controller()
export class TripLogsController {
  constructor(private readonly tripLogsService: TripLogsService) {}

  @Get('vehicles/:vehicleId/trip-logs')
  @ApiOperation({ summary: 'List trip logs for a vehicle' })
  findAll(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.tripLogsService.findAllForVehicle(vehicleId, user.id, pagination.page ?? 1, pagination.limit ?? 20)
  }

  @Post('vehicles/:vehicleId/trip-logs')
  @ApiOperation({ summary: 'Start a trip (driver is set to the calling user)' })
  create(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateTripLogDto,
  ) {
    return this.tripLogsService.create(vehicleId, user.id, dto)
  }

  @Patch('trip-logs/:id')
  @ApiOperation({ summary: 'Update a trip (close it by setting endMileage)' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripLogDto,
  ) {
    return this.tripLogsService.update(id, user.id, dto)
  }

  @Delete('trip-logs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a trip log' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.tripLogsService.remove(id, user.id)
  }
}
