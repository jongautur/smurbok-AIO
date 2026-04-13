import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { VehicleAuthzService } from '../authz/vehicle-authz.service'
import { CreateMileageLogDto } from './dto/create-mileage-log.dto'
import { paginate, type Paginated } from '../common/dto/pagination.dto'

@Injectable()
export class MileageLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly vehicleAuthz: VehicleAuthzService,
  ) {}

  async findAllForVehicle(vehicleId: string, userId: string, page: number, limit: number): Promise<Paginated<object>> {
    await this.vehicleAuthz.requireView(vehicleId, userId)
    const skip = (page - 1) * limit
    const where = { vehicleId }
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.mileageLog.findMany({ where, orderBy: { date: 'desc' }, skip, take: limit }),
      this.prisma.mileageLog.count({ where }),
    ])
    return paginate(logs, total, page, limit)
  }

  async create(vehicleId: string, userId: string, dto: CreateMileageLogDto) {
    await this.vehicleAuthz.requireEdit(vehicleId, userId)

    const highest = await this.prisma.mileageLog.findFirst({
      where: { vehicleId },
      orderBy: { mileage: 'desc' },
      select: { mileage: true },
    })
    if (highest && dto.mileage < highest.mileage) {
      throw new BadRequestException(
        `Mileage ${dto.mileage} is lower than the current highest recorded value (${highest.mileage} km)`,
      )
    }

    const log = await this.prisma.mileageLog.create({
      data: { vehicleId, mileage: dto.mileage, date: new Date(dto.date), note: dto.note },
    })
    this.audit.log(userId, 'CREATE', 'MILEAGE_LOG', log.id)
    return log
  }

  async remove(id: string, userId: string) {
    const log = await this.prisma.mileageLog.findUnique({ where: { id } })
    if (!log) throw new NotFoundException('Mileage log not found')
    await this.vehicleAuthz.requireEdit(log.vehicleId, userId)
    await this.prisma.mileageLog.delete({ where: { id } })
    this.audit.log(userId, 'DELETE', 'MILEAGE_LOG', id)
  }

  async undelete(id: string, userId: string) {
    const log = await this.prisma.mileageLog.findUnique({
      where: { id, deletedAt: { not: null } },
    })
    if (!log) throw new NotFoundException('Deleted mileage log not found')
    await this.vehicleAuthz.requireEdit(log.vehicleId, userId)
    const restored = await this.prisma.mileageLog.update({ where: { id }, data: { deletedAt: null } })
    this.audit.log(userId, 'UPDATE', 'MILEAGE_LOG', id)
    return restored
  }
}
