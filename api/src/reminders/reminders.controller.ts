import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common'
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { RemindersService } from './reminders.service'
import { CreateReminderDto } from './dto/create-reminder.dto'
import { UpdateReminderDto } from './dto/update-reminder.dto'
import { SnoozeReminderDto } from './dto/snooze-reminder.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PaginationDto } from '../common/dto/pagination.dto'

@ApiTags('reminders')
@ApiSecurity('google-workspace')
@Controller()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('vehicles/:vehicleId/reminders')
  findAll(@CurrentUser() user: User, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query() pagination: PaginationDto) {
    return this.remindersService.findAllForVehicle(vehicleId, user.id, pagination.page ?? 1, pagination.limit ?? 20)
  }

  @Post('vehicles/:vehicleId/reminders')
  create(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.remindersService.create(vehicleId, user.id, dto)
  }

  @Patch('reminders/:id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.remindersService.update(id, user.id, dto)
  }

  @Delete('reminders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.remindersService.remove(id, user.id)
  }

  @Post('reminders/:id/snooze')
  @ApiOperation({ summary: 'Snooze a reminder — sets status to SNOOZED and moves the due date. Resets notification flags so emails re-send.' })
  snooze(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SnoozeReminderDto,
  ) {
    return this.remindersService.snooze(id, user.id, dto)
  }

  @Post('reminders/:id/undelete')
  undelete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.remindersService.undelete(id, user.id)
  }
}
