import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { OrgRole, Vehicle } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Org roles that may write to org-owned vehicles and their sub-resources
 * (service records, expenses, reminders, mileage logs, documents).
 * DRIVER and VIEWER are read-only for org vehicles.
 */
const EDIT_ROLES = new Set<OrgRole>(['OWNER', 'MANAGER'])

@Injectable()
export class VehicleAuthzService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the vehicle and asserts view access.
   * Grants access to: personal owner, or any member of the owning organization.
   */
  async requireView(vehicleId: string, userId: string): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    return this.assertView(vehicle, userId)
  }

  /**
   * Resolves the vehicle and asserts edit access.
   * Grants access to: personal owner, or org OWNER/MANAGER.
   */
  async requireEdit(vehicleId: string, userId: string): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    return this.assertEdit(vehicle, userId)
  }

  /**
   * Asserts view access on an already-fetched vehicle (avoids a second DB hit).
   */
  async assertView(vehicle: Vehicle, userId: string): Promise<Vehicle> {
    if (vehicle.userId === userId) return vehicle
    if (vehicle.organizationId) {
      const [org, member] = await Promise.all([
        this.prisma.organization.findUnique({ where: { id: vehicle.organizationId }, select: { suspendedAt: true } }),
        this.prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: vehicle.organizationId, userId } },
        }),
      ])
      if (org?.suspendedAt) throw new ForbiddenException('organization_suspended')
      if (member) return vehicle
    }
    throw new ForbiddenException()
  }

  /**
   * Asserts edit access on an already-fetched vehicle (avoids a second DB hit).
   */
  async assertEdit(vehicle: Vehicle, userId: string): Promise<Vehicle> {
    if (vehicle.userId === userId) return vehicle
    if (vehicle.organizationId) {
      const [org, member] = await Promise.all([
        this.prisma.organization.findUnique({ where: { id: vehicle.organizationId }, select: { suspendedAt: true } }),
        this.prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: vehicle.organizationId, userId } },
        }),
      ])
      if (org?.suspendedAt) throw new ForbiddenException('organization_suspended')
      if (member && EDIT_ROLES.has(member.role)) return vehicle
    }
    throw new ForbiddenException()
  }
}
