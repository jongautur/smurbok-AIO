import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { VehicleAuthzService } from '../authz/vehicle-authz.service'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { UpdateExpenseDto } from './dto/update-expense.dto'
import { paginate, type Paginated } from '../common/dto/pagination.dto'

const LINKED_DOCUMENT_SELECT = {
  id: true,
  vehicleId: true,
  serviceRecordId: true,
  expenseId: true,
  type: true,
  label: true,
  fileUrl: true,
  fileSizeBytes: true,
  createdAt: true,
} as const

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
      this.prisma.expense.findMany({
        where,
        include: {
          documents: {
            where: { deletedAt: null },
            select: LINKED_DOCUMENT_SELECT,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ])
    return paginate(expenses.map((e) => this.toResponse(e)), total, page, limit)
  }

  async create(vehicleId: string, userId: string, dto: CreateExpenseDto) {
    await this.vehicleAuthz.requireEdit(vehicleId, userId)
    await this.assertDocumentsBelongToVehicle(vehicleId, dto.documentIds)
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
    await this.syncLinkedDocuments(vehicleId, expense.id, dto.documentIds)
    if (dto.mileage !== undefined) {
      await this.syncMileageLog(vehicleId, dto.mileage, date)
    }
    this.audit.log(userId, 'CREATE', 'EXPENSE', expense.id)
    return this.findExpenseForResponse(expense.id)
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    const existing = await this.prisma.expense.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Expense not found')
    await this.vehicleAuthz.requireEdit(existing.vehicleId, userId)
    if (dto.documentIds !== undefined) {
      await this.assertDocumentsBelongToVehicle(existing.vehicleId, dto.documentIds)
    }
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        category: dto.category,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : undefined,
        description: dto.description,
        litres: dto.litres,
        customCategory: dto.customCategory,
        recurringMonths: dto.recurringMonths,
        costCenterId: dto.costCenterId,
      },
    })
    if (dto.documentIds !== undefined) {
      await this.syncLinkedDocuments(existing.vehicleId, id, dto.documentIds)
    }
    this.audit.log(userId, 'UPDATE', 'EXPENSE', id)
    return this.findExpenseForResponse(expense.id)
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

  private async syncLinkedDocuments(vehicleId: string, expenseId: string, documentIds?: string[]) {
    if (documentIds === undefined) return

    const uniqueIds = await this.assertDocumentsBelongToVehicle(vehicleId, documentIds)

    await this.prisma.$transaction([
      this.prisma.document.updateMany({
        where: { expenseId, vehicleId, id: { notIn: uniqueIds } },
        data: { expenseId: null },
      }),
      ...(uniqueIds.length
        ? [
            this.prisma.document.updateMany({
              where: { id: { in: uniqueIds }, vehicleId, deletedAt: null },
              data: { expenseId },
            }),
          ]
        : []),
    ])
  }

  private async assertDocumentsBelongToVehicle(vehicleId: string, documentIds?: string[]) {
    const uniqueIds = Array.from(new Set(documentIds ?? []))
    if (uniqueIds.length > 0) {
      const count = await this.prisma.document.count({
        where: { id: { in: uniqueIds }, vehicleId, deletedAt: null },
      })
      if (count !== uniqueIds.length) {
        throw new BadRequestException('One or more documents do not belong to this vehicle')
      }
    }
    return uniqueIds
  }

  private async findExpenseForResponse(id: string) {
    const expense = await this.prisma.expense.findUniqueOrThrow({
      where: { id },
      include: {
        documents: {
          where: { deletedAt: null },
          select: LINKED_DOCUMENT_SELECT,
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return this.toResponse(expense)
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
      documents: expense.documents ?? [],
      createdAt: expense.createdAt,
    }
  }
}
