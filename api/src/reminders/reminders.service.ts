import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateReminderDto } from './dto/create-reminder.dto'
import { UpdateReminderDto } from './dto/update-reminder.dto'

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForVehicle(vehicleId: string, userId: string) {
    await this.requireVehicleOwned(vehicleId, userId)
    return this.prisma.reminder.findMany({
      where: { vehicleId },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    })
  }

  async create(vehicleId: string, userId: string, dto: CreateReminderDto) {
    await this.requireVehicleOwned(vehicleId, userId)
    return this.prisma.reminder.create({
      data: {
        vehicleId,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        dueMileage: dto.dueMileage,
        note: dto.note,
      },
    })
  }

  async update(id: string, userId: string, dto: UpdateReminderDto) {
    await this.requireReminderOwned(id, userId)
    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    })
  }

  async remove(id: string, userId: string) {
    await this.requireReminderOwned(id, userId)
    await this.prisma.reminder.delete({ where: { id } })
  }

  // ── private ──────────────────────────────────────────────────────────────────

  private async requireVehicleOwned(vehicleId: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true },
    })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    if (vehicle.userId !== userId) throw new ForbiddenException()
  }

  private async requireReminderOwned(id: string, userId: string) {
    const reminder = await this.prisma.reminder.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    })
    if (!reminder) throw new NotFoundException('Reminder not found')
    if (reminder.vehicle.userId !== userId) throw new ForbiddenException()
  }
}
