import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForVehicle(vehicleId: string, userId: string) {
    await this.requireVehicleOwned(vehicleId, userId)
    const expenses = await this.prisma.expense.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    })
    return expenses.map((e) => this.toResponse(e))
  }

  async create(vehicleId: string, userId: string, dto: CreateExpenseDto) {
    await this.requireVehicleOwned(vehicleId, userId)
    const expense = await this.prisma.expense.create({
      data: {
        vehicleId,
        category: dto.category,
        amount: dto.amount,
        date: new Date(dto.date),
        description: dto.description,
      },
    })
    return this.toResponse(expense)
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    await this.requireExpenseOwned(id, userId)
    const expense = await this.prisma.expense.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    })
    return this.toResponse(expense)
  }

  async remove(id: string, userId: string) {
    await this.requireExpenseOwned(id, userId)
    await this.prisma.expense.delete({ where: { id } })
  }

  private async requireVehicleOwned(vehicleId: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true },
    })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    if (vehicle.userId !== userId) throw new ForbiddenException()
  }

  private async requireExpenseOwned(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    })
    if (!expense) throw new NotFoundException('Expense not found')
    if (expense.vehicle.userId !== userId) throw new ForbiddenException()
  }

  private toResponse(expense: any) {
    return {
      id: expense.id,
      vehicleId: expense.vehicleId,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      description: expense.description,
      createdAt: expense.createdAt,
    }
  }
}
