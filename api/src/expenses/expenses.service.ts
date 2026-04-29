import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { VehicleAuthzService } from '../authz/vehicle-authz.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { paginate, type Paginated } from '../common/dto/pagination.dto'

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly vehicleAuthz: VehicleAuthzService,
  ) {}

  async findAllForVehicle(vehicleId: string, userId: string, page: number, limit: number): Promise<Paginated<ReturnType<typeof this.toResponse>>> {
    await this.vehicleAuthz.requireView(vehicleId, userId)
    const skip = (page - 1) * limit
    const where = { vehicleId }
    const [expenses, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({ where, orderBy: { date: 'desc' }, skip, take: limit }),
      this.prisma.expense.count({ where }),
    ])
    return paginate(expenses.map((e) => this.toResponse(e)), total, page, limit)
  }

  async create(vehicleId: string, userId: string, dto: CreateExpenseDto) {
    await this.vehicleAuthz.requireEdit(vehicleId, userId)
    const date = new Date(dto.date)
    const expense = await this.prisma.expense.create({
      data: {
        vehicleId,
        category: dto.category,
        amount: dto.amount,
        date,
        description: dto.description,
        litres: dto.litres,
        customCategory: dto.customCategory,
        recurringMonths: dto.recurringMonths,
        costCenterId: dto.costCenterId,
      },
    })
    if (dto.mileage !== undefined) {
      await this.syncMileageLog(vehicleId, dto.mileage, date)
    }
    this.audit.log(userId, 'CREATE', 'EXPENSE', expense.id)
    return this.toResponse(expense)
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Expense not found')
    await this.vehicleAuthz.requireEdit(existing.vehicleId, userId)
    const expense = await this.prisma.expense.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    })
    this.audit.log(userId, 'UPDATE', 'EXPENSE', id)
    return this.toResponse(expense)
  }

  async remove(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } })
    if (!expense) throw new NotFoundException('Expense not found')
    await this.vehicleAuthz.requireEdit(expense.vehicleId, userId)
    await this.prisma.expense.delete({ where: { id } })
    this.audit.log(userId, 'DELETE', 'EXPENSE', id)
  }

  async undelete(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id, deletedAt: { not: null } },
    })
    if (!expense) throw new NotFoundException('Deleted expense not found')
    await this.vehicleAuthz.requireEdit(expense.vehicleId, userId)
    const restored = await this.prisma.expense.update({ where: { id }, data: { deletedAt: null } })
    this.audit.log(userId, 'UPDATE', 'EXPENSE', id)
    return this.toResponse(restored)
  }

  private async syncMileageLog(vehicleId: string, mileage: number, date: Date) {
    const latest = await this.prisma.mileageLog.findFirst({
      where: { vehicleId },
      orderBy: { mileage: 'desc' },
      select: { mileage: true },
    })
    if (latest && latest.mileage >= mileage) return
    await this.prisma.mileageLog.create({
      data: { vehicleId, mileage, date },
    })
  }

  private toResponse(expense: any) {
    return {
      id: expense.id,
      vehicleId: expense.vehicleId,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      description: expense.description,
      litres: expense.litres,
      customCategory: expense.customCategory,
      recurringMonths: expense.recurringMonths,
      createdAt: expense.createdAt,
    }
  }
}
