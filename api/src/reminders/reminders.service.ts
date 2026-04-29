import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { VehicleAuthzService } from '../authz/vehicle-authz.service'
import { CreateReminderDto } from './dto/create-reminder.dto'
import { UpdateReminderDto } from './dto/update-reminder.dto'
import { SnoozeReminderDto } from './dto/snooze-reminder.dto'
import { paginate, type Paginated } from '../common/dto/pagination.dto'

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly vehicleAuthz: VehicleAuthzService,
  ) {}

  async findAllForVehicle(vehicleId: string, userId: string, page: number, limit: number): Promise<Paginated<object>> {
    await this.vehicleAuthz.requireView(vehicleId, userId)
    const skip = (page - 1) * limit
    const where = { vehicleId }
    const [reminders, total] = await this.prisma.$transaction([
      this.prisma.reminder.findMany({ where, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }], skip, take: limit }),
      this.prisma.reminder.count({ where }),
    ])
    return paginate(reminders, total, page, limit)
  }

  async create(vehicleId: string, userId: string, dto: CreateReminderDto) {
    await this.vehicleAuthz.requireEdit(vehicleId, userId)
    const reminder = await this.prisma.reminder.create({
      data: {
        vehicleId,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        dueMileage: dto.dueMileage,
        note: dto.note,
        recurrenceMonths: dto.recurrenceMonths,
      },
    })
    this.audit.log(userId, 'CREATE', 'REMINDER', reminder.id)
    return reminder
  }

  async update(id: string, userId: string, dto: UpdateReminderDto) {
    const existing = await this.prisma.reminder.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException('Reminder not found')
    await this.vehicleAuthz.requireEdit(existing.vehicleId, userId)
    const reminder = await this.prisma.reminder.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    })

    // Auto-create next occurrence when marking DONE on a recurring reminder
    if (dto.status === 'DONE' && existing.status !== 'DONE' && reminder.recurrenceMonths && reminder.dueDate) {
      const nextDate = new Date(reminder.dueDate)
      nextDate.setMonth(nextDate.getMonth() + reminder.recurrenceMonths)
      await this.prisma.reminder.create({
        data: {
          vehicleId: existing.vehicleId,
          type: reminder.type,
          dueDate: nextDate,
          recurrenceMonths: reminder.recurrenceMonths,
          note: reminder.note ?? undefined,
        },
      })
    }

    this.audit.log(userId, 'UPDATE', 'REMINDER', id)
    return reminder
  }

  async remove(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } })
    if (!reminder) throw new NotFoundException('Reminder not found')
    await this.vehicleAuthz.requireEdit(reminder.vehicleId, userId)
    await this.prisma.reminder.delete({ where: { id } })
    this.audit.log(userId, 'DELETE', 'REMINDER', id)
  }

  async undelete(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id, deletedAt: { not: null } },
    })
    if (!reminder) throw new NotFoundException('Deleted reminder not found')
    await this.vehicleAuthz.requireEdit(reminder.vehicleId, userId)
    const restored = await this.prisma.reminder.update({ where: { id }, data: { deletedAt: null } })
    this.audit.log(userId, 'UPDATE', 'REMINDER', id)
    return restored
  }

  async snooze(id: string, userId: string, dto: SnoozeReminderDto) {
    if (!dto.days && !dto.date) {
      throw new BadRequestException('Provide either days or date')
    }
    const reminder = await this.prisma.reminder.findUnique({ where: { id } })
    if (!reminder) throw new NotFoundException('Reminder not found')
    await this.vehicleAuthz.requireEdit(reminder.vehicleId, userId)

    let newDueDate: Date
    if (dto.date) {
      newDueDate = new Date(dto.date)
    } else {
      newDueDate = new Date()
      newDueDate.setDate(newDueDate.getDate() + dto.days!)
    }

    const updated = await this.prisma.reminder.update({
      where: { id },
      data: {
        status: 'SNOOZED',
        dueDate: newDueDate,
        notified14Days: false,
        notified7Days: false,
        notifiedDueDate: false,
      },
    })
    this.audit.log(userId, 'UPDATE', 'REMINDER', id)
    return updated
  }

}
