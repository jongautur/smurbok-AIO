import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMileageLogDto } from './dto/create-mileage-log.dto'

@Injectable()
export class MileageLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForVehicle(vehicleId: string, userId: string) {
    await this.requireVehicleOwned(vehicleId, userId)
    return this.prisma.mileageLog.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    })
  }

  async create(vehicleId: string, userId: string, dto: CreateMileageLogDto) {
    await this.requireVehicleOwned(vehicleId, userId)
    return this.prisma.mileageLog.create({
      data: { vehicleId, mileage: dto.mileage, date: new Date(dto.date), note: dto.note },
    })
  }

  async remove(id: string, userId: string) {
    const log = await this.prisma.mileageLog.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    })
    if (!log) throw new NotFoundException('Mileage log not found')
    if (log.vehicle.userId !== userId) throw new ForbiddenException()
    await this.prisma.mileageLog.delete({ where: { id } })
  }

  private async requireVehicleOwned(vehicleId: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true },
    })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    if (vehicle.userId !== userId) throw new ForbiddenException()
  }
}
