import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { OrgRole, OrgType, ServiceType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { paginate, type Paginated } from '../common/dto/pagination.dto'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateWorkOrderDto } from './dto/create-work-order.dto'
import { UpdateWorkOrderDto } from './dto/update-work-order.dto'
import { SignWorkOrderDto } from './dto/sign-work-order.dto'

// Role hierarchy: OWNER > MANAGER > TECHNICIAN = DRIVER > VIEWER
const ROLE_WEIGHT: Record<OrgRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  TECHNICIAN: 2,
  DRIVER: 2,
  VIEWER: 1,
}

const WORK_ORDER_INCLUDE = {
  vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true, vin: true } },
  workshopOrg: { select: { id: true, name: true } },
  technician: { select: { id: true, displayName: true, email: true } },
}

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateWorkOrderDto) {
    // Must be TECHNICIAN+ in the workshop org
    await this.requireWorkshopRole(dto.workshopOrgId, userId, 'TECHNICIAN')

    // Verify the vehicle exists
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } })
    if (!vehicle) throw new NotFoundException('Vehicle not found')

    // If technicianId provided, verify they are a member of the workshop
    if (dto.technicianId) {
      await this.requireWorkshopMembership(dto.workshopOrgId, dto.technicianId)
    }

    const wo = await this.prisma.workOrder.create({
      data: {
        vehicleId: dto.vehicleId,
        workshopOrgId: dto.workshopOrgId,
        technicianId: dto.technicianId ?? null,
        description: dto.description,
      },
      include: WORK_ORDER_INCLUDE,
    })
    this.audit.log(userId, 'CREATE', 'WORK_ORDER', wo.id)
    return wo
  }

  async findAllForWorkshop(userId: string, workshopOrgId: string, page: number, limit: number): Promise<Paginated<any>> {
    await this.requireWorkshopMembership(workshopOrgId, userId)
    const skip = (page - 1) * limit
    const where = { workshopOrgId, cancelledAt: null }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({ where, include: WORK_ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.workOrder.count({ where }),
    ])
    return paginate(items, total, page, limit)
  }

  async findAllForVehicle(userId: string, vehicleId: string, page: number, limit: number): Promise<Paginated<any>> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException('Vehicle not found')

    const canAccess = vehicle.userId === userId
      || (vehicle.organizationId !== null && await this.prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: vehicle.organizationId, userId } },
        }).then(Boolean))

    if (!canAccess) throw new ForbiddenException()

    const skip = (page - 1) * limit
    const where = { vehicleId, cancelledAt: null }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.workOrder.findMany({ where, include: WORK_ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.workOrder.count({ where }),
    ])
    return paginate(items, total, page, limit)
  }

  async findOne(userId: string, id: string) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id }, include: WORK_ORDER_INCLUDE })
    if (!wo) throw new NotFoundException('Work order not found')
    await this.requireAccess(userId, wo)
    return wo
  }

  async update(userId: string, id: string, dto: UpdateWorkOrderDto) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id } })
    if (!wo) throw new NotFoundException('Work order not found')
    if (wo.signedAt) throw new BadRequestException('Cannot edit a signed work order')

    await this.requireWorkshopRole(wo.workshopOrgId, userId, 'TECHNICIAN')

    if (dto.technicianId) {
      await this.requireWorkshopMembership(wo.workshopOrgId, dto.technicianId)
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: dto,
      include: WORK_ORDER_INCLUDE,
    })
    this.audit.log(userId, 'UPDATE', 'WORK_ORDER', id)
    return updated
  }

  async cancel(userId: string, id: string) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id } })
    if (!wo) throw new NotFoundException('Work order not found')
    if (wo.cancelledAt) throw new BadRequestException('Work order is already cancelled')
    if (wo.signedAt) throw new BadRequestException('Cannot cancel a signed work order')
    await this.requireWorkshopRole(wo.workshopOrgId, userId, 'MANAGER')
    await this.prisma.workOrder.update({ where: { id }, data: { cancelledAt: new Date() } })
    this.audit.log(userId, 'DELETE', 'WORK_ORDER', id)
  }

  async complete(userId: string, id: string) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id } })
    if (!wo) throw new NotFoundException('Work order not found')
    if (wo.completedAt) throw new BadRequestException('Work order is already completed')

    await this.requireWorkshopRole(wo.workshopOrgId, userId, 'TECHNICIAN')

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: { completedAt: new Date() },
      include: WORK_ORDER_INCLUDE,
    })
    this.notifications.sendWorkOrderCompleted(id).catch(() => {})
    return updated
  }

  async sign(userId: string, id: string, dto: SignWorkOrderDto) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      include: { workshopOrg: { select: { name: true } } },
    })
    if (!wo) throw new NotFoundException('Work order not found')
    if (!wo.completedAt) throw new BadRequestException('Work order must be completed before signing')
    if (wo.signedAt) throw new BadRequestException('Work order is already signed')

    await this.requireWorkshopRole(wo.workshopOrgId, userId, 'TECHNICIAN')

    const ops: any[] = [
      this.prisma.workOrder.update({
        where: { id },
        data: { signedAt: new Date() },
        include: WORK_ORDER_INCLUDE,
      }),
    ]

    if (dto.mileage !== undefined) {
      ops.push(
        this.prisma.serviceRecord.create({
          data: {
            vehicleId: wo.vehicleId,
            types: [dto.serviceType ?? ServiceType.OTHER],
            mileage: dto.mileage,
            date: wo.completedAt!,
            description: wo.description,
            cost: dto.cost !== undefined ? dto.cost : undefined,
            shop: wo.workshopOrg.name,
          },
        }),
      )
    }

    const [updated] = await this.prisma.$transaction(ops)
    this.notifications.sendWorkOrderSigned(id).catch(() => {})
    this.audit.log(userId, 'UPDATE', 'WORK_ORDER', id)
    return updated
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async requireWorkshopMembership(workshopOrgId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: workshopOrgId } })
    if (!org) throw new NotFoundException('Workshop organization not found')
    if (org.type !== OrgType.WORKSHOP) throw new BadRequestException('Organization is not a workshop')

    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: workshopOrgId, userId } },
    })
    if (!member) throw new ForbiddenException('Not a member of this workshop')
    return member
  }

  private async requireWorkshopRole(workshopOrgId: string, userId: string, minRole: keyof typeof ROLE_WEIGHT) {
    const member = await this.requireWorkshopMembership(workshopOrgId, userId)
    if (ROLE_WEIGHT[member.role] < ROLE_WEIGHT[minRole]) {
      throw new ForbiddenException(`Requires ${minRole} role or higher`)
    }
    return member
  }

  private async requireAccess(userId: string, wo: { workshopOrgId: string; vehicleId: string }) {
    // Workshop member OR vehicle owner
    const [workshopMember, vehicle] = await Promise.all([
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: wo.workshopOrgId, userId } },
      }),
      this.prisma.vehicle.findUnique({ where: { id: wo.vehicleId } }),
    ])

    if (workshopMember) return

    if (!vehicle) throw new ForbiddenException()

    const isVehicleOwner = vehicle.userId === userId
    const isOrgMember = vehicle.organizationId !== null && await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: vehicle.organizationId, userId } },
    }).then(Boolean)

    if (!isVehicleOwner && !isOrgMember) throw new ForbiddenException()
  }
}
