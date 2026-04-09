import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { RemindersService } from './reminders.service'
import { CreateReminderDto } from './dto/create-reminder.dto'
import { UpdateReminderDto } from './dto/update-reminder.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('reminders')
@ApiBearerAuth()
@Controller()
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('vehicles/:vehicleId/reminders')
  findAll(@CurrentUser() user: User, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.remindersService.findAllForVehicle(vehicleId, user.id)
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
}
