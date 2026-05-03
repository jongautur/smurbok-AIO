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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { VehicleOverviewDto } from './dto/vehicle-overview.dto';
import type { User } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateTransferDto, AcceptTransferDto, DeclineTransferDto } from './dto/create-transfer.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto'
import { VehicleListQueryDto } from './dto/vehicle-list-query.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('vehicles')
@ApiSecurity('google-workspace')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query() query: VehicleListQueryDto) {
    return this.vehiclesService.findAll(user.id, query.page ?? 1, query.limit ?? 20, query.archived ?? false);
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
  getTimeline(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.vehiclesService.getTimeline(id, user.id, pagination.page ?? 1, pagination.limit ?? 20);
  }

  @Get(':id/export/service-history.pdf')
  @ApiOperation({ summary: 'Export full service history as PDF — service records, expenses, mileage summary' })
  exportServiceHistoryPdf(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    return this.vehiclesService.exportServiceHistoryPdf(id, user.id, res);
  }

  @Get(':id/fuel-efficiency')
  @ApiOperation({
    summary: 'Fuel efficiency — km/L and L/100km calculated from FUEL expenses with litres set and mileage logs',
    description: 'Filter by `from`/`to` date (ISO 8601) to narrow the calculation period. Returns `insufficientData: true` if fewer than 2 mileage logs or no fuel entries with litres exist.',
  })
  getFuelEfficiency(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.vehiclesService.getFuelEfficiency(id, user.id, from, to);
  }

  @Get(':id/costs/summary')
  getCostSummary(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('year') year?: string,
  ) {
    return this.vehiclesService.getCostSummary(id, user.id, year ? parseInt(year) : undefined)
  }

  // ── Share Tokens ──────────────────────────────────────────────────────────────

  @Public()
  @Get('shared/:token')
  @ApiOperation({ summary: 'Get shared vehicle history by token (public)' })
  getSharedVehicle(@Param('token') token: string) {
    return this.vehiclesService.getSharedVehicle(token)
  }

  @Post(':id/share')
  createShareToken(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { label?: string; expiresAt?: string },
  ) {
    return this.vehiclesService.createShareToken(id, user.id, body.label, body.expiresAt)
  }

  @Get(':id/share')
  listShareTokens(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.listShareTokens(id, user.id)
  }

  @Delete(':id/share/:tokenId')
  revokeShareToken(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
  ) {
    return this.vehiclesService.revokeShareToken(id, tokenId, user.id)
  }

  // ── Vehicle Transfer ─────────────────────────────────────────────────────────

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Initiate a vehicle ownership transfer — sends an email link to the recipient' })
  initiateTransfer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.vehiclesService.initiateTransfer(id, user.id, dto);
  }

  @Get(':id/transfers')
  @ApiOperation({ summary: 'List pending transfers for a vehicle' })
  listPendingTransfers(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.listPendingTransfers(id, user.id);
  }

  @Delete(':id/transfers/:transferId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending transfer' })
  cancelTransfer(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('transferId', ParseUUIDPipe) transferId: string,
  ) {
    return this.vehiclesService.cancelTransfer(transferId, user.id);
  }

  @Public()
  @Get('transfers/check')
  @ApiOperation({ summary: 'Check transfer token validity (public) — used by recipient before logging in' })
  checkTransfer(@Query('token') token: string) {
    return this.vehiclesService.checkTransfer(token);
  }

  @Post('transfers/accept')
  @ApiOperation({ summary: 'Accept a vehicle transfer — caller must be logged in with the invited email' })
  acceptTransfer(@CurrentUser() user: User, @Body() dto: AcceptTransferDto) {
    return this.vehiclesService.acceptTransfer(dto.token, user.id);
  }

  @Post('transfers/decline')
  @ApiOperation({ summary: 'Decline a vehicle transfer' })
  declineTransfer(@CurrentUser() user: User, @Body() dto: DeclineTransferDto) {
    return this.vehiclesService.declineTransfer(dto.token, user.id);
  }
}
