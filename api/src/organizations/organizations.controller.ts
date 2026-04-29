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
} from '@nestjs/common'
import { ApiSecurity, ApiTags, ApiOperation } from '@nestjs/swagger'
import type { Response } from 'express'
import type { User } from '@prisma/client'
import { OrganizationsService } from './organizations.service'
import { CreateOrgDto } from './dto/create-org.dto'
import { UpdateOrgDto } from './dto/update-org.dto'
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto'
import { CreateOrgVehicleDto } from './dto/create-org-vehicle.dto'
import { BulkReminderDto } from './dto/bulk-reminder.dto'
import { CostQueryDto } from './dto/cost-query.dto'
import { CreateInviteDto } from './dto/create-invite.dto'
import { AcceptInviteDto } from './dto/accept-invite.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { Admin } from '../auth/decorators/admin.decorator'

@ApiTags('organizations')
@ApiSecurity('google-workspace')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  // ── Org CRUD ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create an organization (caller becomes OWNER)' })
  create(@CurrentUser() user: User, @Body() dto: CreateOrgDto) {
    return this.orgsService.create(user.id, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List organizations I am a member of' })
  findAll(@CurrentUser() user: User) {
    return this.orgsService.findAllForUser(user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.findOne(id, user.id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update org (MANAGER+)' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrgDto,
  ) {
    return this.orgsService.update(id, user.id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete org and all its data (OWNER only)' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.remove(id, user.id)
  }

  // ── Members ───────────────────────────────────────────────────────────────

  @Get(':id/members')
  @ApiOperation({ summary: 'List org members' })
  listMembers(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.listMembers(id, user.id)
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member by email (MANAGER+)' })
  addMember(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.orgsService.addMember(id, user.id, dto)
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: 'Update a member role (OWNER only)' })
  updateMemberRole(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgsService.updateMemberRole(id, user.id, targetUserId, dto)
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member (MANAGER+)' })
  removeMember(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.orgsService.removeMember(id, user.id, targetUserId)
  }

  // ── Org Vehicles ──────────────────────────────────────────────────────────

  @Get(':id/vehicles')
  @ApiOperation({ summary: 'List org vehicles' })
  listVehicles(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.listVehicles(id, user.id)
  }

  @Post(':id/vehicles')
  @ApiOperation({ summary: 'Add a vehicle to the org (MANAGER+)' })
  createVehicle(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrgVehicleDto,
  ) {
    return this.orgsService.createVehicle(id, user.id, dto)
  }

  @Patch(':id/vehicles/:vehicleId')
  @ApiOperation({ summary: 'Update an org vehicle (MANAGER+)' })
  updateVehicle(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateOrgVehicleDto,
  ) {
    return this.orgsService.updateVehicle(id, user.id, vehicleId, dto)
  }

  @Delete(':id/vehicles/:vehicleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a vehicle from the org (MANAGER+)' })
  removeVehicle(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.orgsService.removeVehicle(id, user.id, vehicleId)
  }

  // ── Fleet Dashboard ───────────────────────────────────────────────────────

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Fleet dashboard: vehicles, open trips, upcoming reminders, this-month costs' })
  getDashboard(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.getDashboard(id, user.id)
  }

  // ── Cost Reporting ────────────────────────────────────────────────────────

  @Get(':id/costs')
  @ApiOperation({ summary: 'Cost report — filterable by vehicle, category, date range' })
  getCosts(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CostQueryDto,
  ) {
    return this.orgsService.getCosts(id, user.id, query)
  }

  // ── Bulk Reminders ────────────────────────────────────────────────────────

  @Post(':id/reminders/bulk')
  @ApiOperation({ summary: 'Create the same reminder on multiple (or all) org vehicles (MANAGER+)' })
  bulkReminders(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BulkReminderDto,
  ) {
    return this.orgsService.createBulkReminders(id, user.id, dto)
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  @Get(':id/export/costs.csv')
  @ApiOperation({ summary: 'Export cost report as CSV' })
  async exportCsv(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CostQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.orgsService.exportCostsCsv(id, user.id, query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="costs-${id}.csv"`)
    res.send('\uFEFF' + csv) // BOM for Excel
  }

  @Get(':id/export/costs.pdf')
  @ApiOperation({ summary: 'Export cost report as PDF' })
  exportPdf(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CostQueryDto,
    @Res() res: Response,
  ) {
    return this.orgsService.exportCostsPdf(id, user.id, query, res)
  }

  // ── Invites ───────────────────────────────────────────────────────────────

  @Get('invites/check')
  @Public()
  @ApiOperation({ summary: 'Preview an invite (public) — returns org name and role' })
  checkInvite(@Query('token') token: string) {
    return this.orgsService.checkInvite(token)
  }

  @Post('invites/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invite — adds the caller to the org' })
  acceptInvite(@CurrentUser() user: User, @Body() dto: AcceptInviteDto) {
    return this.orgsService.acceptInvite(dto.token, user.id)
  }

  @Post(':id/invites')
  @ApiOperation({ summary: 'Invite a user to join the organization by email' })
  createInvite(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.orgsService.createInvite(id, user.id, dto)
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'List pending invites for the organization' })
  listInvites(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.listInvites(id, user.id)
  }

  @Delete(':id/invites/:inviteId')
  @ApiOperation({ summary: 'Revoke a pending invite' })
  revokeInvite(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    return this.orgsService.revokeInvite(id, inviteId, user.id)
  }

  // ── Admin: suspend / unsuspend ────────────────────────────────────────────

  @Post(':id/suspend')
  @Admin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Suspend an organization' })
  suspendOrg(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.suspend(id, actor.id)
  }

  @Post(':id/unsuspend')
  @Admin()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Unsuspend an organization' })
  unsuspendOrg(@CurrentUser() actor: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgsService.unsuspend(id, actor.id)
  }
}
