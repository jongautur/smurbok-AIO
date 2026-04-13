import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { CreateTripLogDto } from './dto/create-trip-log.dto'
import { UpdateTripLogDto } from './dto/update-trip-log.dto'
import { paginate, type Paginated } from '../common/dto/pagination.dto'

@Injectable()
export class TripLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async findAllForVehicle(vehicleId: string, userId: string, page: number, limit: number): Promise<Paginated<object>> {
    await this.requireVehicleAccess(vehicleId, userId)
    const skip = (page - 1) * limit
    const where = { vehicleId }
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.tripLog.findMany({
        where,
        include: { driver: { select: { id: true, displayName: true, email: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.tripLog.count({ where }),
    ])
    return paginate(logs, total, page, limit)
  }

  async create(vehicleId: string, userId: string, dto: CreateTripLogDto) {
    await this.requireVehicleAccess(vehicleId, userId)

    // Warn if there's already an open trip (endMileage is null)
    const openTrip = await this.prisma.tripLog.findFirst({
      where: { vehicleId, endMileage: null },
    })
    if (openTrip) throw new BadRequestException('Vehicle already has an open trip. Close it before starting a new one.')

    const log = await this.prisma.tripLog.create({
      data: {
        vehicleId,
        driverId: userId,
        startMileage: dto.startMileage,
        date: new Date(dto.date),
        purpose: dto.purpose,
        note: dto.note,
      },
      include: { driver: { select: { id: true, displayName: true, email: true } } },
    })
    this.audit.log(userId, 'CREATE', 'MILEAGE_LOG', log.id)
    return log
  }

  async update(id: string, userId: string, dto: UpdateTripLogDto) {
    const log = await this.requireTripAccess(id, userId)

    if (dto.endMileage !== undefined && dto.endMileage < log.startMileage) {
      throw new BadRequestException('End mileage cannot be less than start mileage')
    }

    const updated = await this.prisma.tripLog.update({
      where: { id },
      data: dto,
      include: { driver: { select: { id: true, displayName: true, email: true } } },
    })
    this.audit.log(userId, 'UPDATE', 'MILEAGE_LOG', id)
    return updated
  }

  async remove(id: string, userId: string) {
    await this.requireTripAccess(id, userId)
    await this.prisma.tripLog.delete({ where: { id } })
    this.audit.log(userId, 'DELETE', 'MILEAGE_LOG', id)
  }

  // ── private ───────────────────────────────────────────────────────────────

  private async requireVehicleAccess(vehicleId: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { organization: { include: { members: { where: { userId } } } } },
    })
    if (!vehicle) throw new NotFoundException('Vehicle not found')

    // Personal vehicle: owner only
    if (vehicle.userId) {
      if (vehicle.userId !== userId) throw new ForbiddenException()
      return
    }

    // Org vehicle: any member (drivers log their own trips)
    if (vehicle.organizationId) {
      if (!vehicle.organization?.members.length) throw new ForbiddenException('Not a member of this organization')
      return
    }

    throw new ForbiddenException()
  }

  private async requireTripAccess(id: string, userId: string) {
    const log = await this.prisma.tripLog.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: { organization: { include: { members: { where: { userId } } } } },
        },
      },
    })
    if (!log) throw new NotFoundException('Trip log not found')

    // Driver can always edit their own trip
    if (log.driverId === userId) return log

    // For org vehicles: only MANAGER or OWNER can edit other drivers' trips
    if (log.vehicle.organizationId && log.vehicle.organization?.members.length) {
      const member = log.vehicle.organization.members[0]
      if (member.role === 'MANAGER' || member.role === 'OWNER') return log
    }

    throw new ForbiddenException()
  }
}
