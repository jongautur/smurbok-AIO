import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@ApiTags('expenses')
@ApiBearerAuth()
@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('vehicles/:vehicleId/expenses')
  findAll(@CurrentUser() user: User, @Param('vehicleId', ParseUUIDPipe) vehicleId: string) {
    return this.expensesService.findAllForVehicle(vehicleId, user.id)
  }

  @Post('vehicles/:vehicleId/expenses')
  create(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(vehicleId, user.id, dto)
  }

  @Patch('expenses/:id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(id, user.id, dto)
  }

  @Delete('expenses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(id, user.id)
  }
}
