import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common'
import { ApiSecurity, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { ExpensesService } from './expenses.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PaginationDto } from '../common/dto/pagination.dto'

@ApiTags('expenses')
@ApiSecurity('google-workspace')
@Controller()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get('vehicles/:vehicleId/expenses')
  findAll(@CurrentUser() user: User, @Param('vehicleId', ParseUUIDPipe) vehicleId: string, @Query() pagination: PaginationDto) {
    return this.expensesService.findAllForVehicle(vehicleId, user.id, pagination.page ?? 1, pagination.limit ?? 20)
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

  @Post('expenses/:id/undelete')
  undelete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.undelete(id, user.id)
  }
}
