import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { VehicleOverviewDto } from './dto/vehicle-overview.dto';
import type { User } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('vehicles')
@ApiSecurity('google-workspace')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.vehiclesService.findAll(user.id, pagination.page ?? 1, pagination.limit ?? 20);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(user.id, dto);
  }

  @Get('lookup')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Lookup a vehicle by licensePlate or vin (workshop members and admins only)' })
  lookup(
    @CurrentUser() user: User,
    @Query('licensePlate') licensePlate?: string,
    @Query('vin') vin?: string,
  ) {
    return this.vehiclesService.lookup({ licensePlate, vin }, user.id)
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(id, user.id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a vehicle — hides it from lists but retains all history' })
  archive(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.archive(id, user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore an archived vehicle back to the active list' })
  restore(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.restore(id, user.id);
  }

  @Post(':id/undelete')
  @ApiOperation({ summary: 'Recover a soft-deleted vehicle within 7 days of deletion' })
  undelete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.undelete(id, user.id);
  }

  @Get(':id/overview')
  @ApiOperation({ summary: 'Get vehicle overview including latest/estimated mileage, last service, and upcoming reminders' })
  @ApiResponse({ status: 200, type: VehicleOverviewDto })
  getOverview(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.getOverview(id, user.id);
  }

  @Get(':id/timeline')
  getTimeline(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.getTimeline(id, user.id);
  }
}
