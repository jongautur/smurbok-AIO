import { Injectable, PayloadTooLargeException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

const TIER_LIMITS: Record<number, { documents: number; vehicles: number }> = {
  0: { documents: 100, vehicles: 3 },
  1: { documents: 200, vehicles: 5 },
  2: { documents: 500, vehicles: 10 },
}

function limitsForTier(tier: number) {
  return TIER_LIMITS[tier] ?? TIER_LIMITS[0]
}

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsage(userId: string) {
    const [documents, vehiclesCount, user] = await Promise.all([
      this.prisma.document.findMany({
        where: { vehicle: { userId, deletedAt: null }, deletedAt: null },
        select: {
          id: true,
          label: true,
          type: true,
          fileSizeBytes: true,
          vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
        },
        orderBy: { fileSizeBytes: 'desc' },
      }),
      this.prisma.vehicle.count({ where: { userId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { tier: true } }),
    ])

    const limits = limitsForTier(user.tier)

    return {
      tier: user.tier,
      documents: {
        count: documents.length,
        limit: limits.documents,
      },
      vehicles: {
        count: vehiclesCount,
        limit: limits.vehicles,
      },
      topDocuments: documents.map((d) => ({
        id: d.id,
        label: d.label,
        type: d.type,
        fileSizeBytes: d.fileSizeBytes,
        vehicleId: d.vehicle.id,
        vehicleLabel: [d.vehicle.make, d.vehicle.model, d.vehicle.licensePlate ? `(${d.vehicle.licensePlate})` : null]
          .filter(Boolean)
          .join(' '),
      })),
    }
  }

  async enforceDocumentLimit(userId: string): Promise<void> {
    const [count, user] = await Promise.all([
      this.prisma.document.count({
        where: { vehicle: { userId, deletedAt: null }, deletedAt: null },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { tier: true } }),
    ])
    const limit = limitsForTier(user.tier).documents
    if (count >= limit) {
      throw new PayloadTooLargeException(
        `Document limit reached. Maximum ${limit} documents per account.`,
      )
    }
  }

  async enforceVehicleLimit(userId: string): Promise<void> {
    const [count, user] = await Promise.all([
      this.prisma.vehicle.count({ where: { userId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { tier: true } }),
    ])
    const limit = limitsForTier(user.tier).vehicles
    if (count >= limit) {
      throw new PayloadTooLargeException(
        `Vehicle limit reached. Maximum ${limit} vehicles per account.`,
      )
    }
  }

  async setUserTier(userId: string, tier: number): Promise<void> {
    if (!TIER_LIMITS[tier]) {
      throw new Error(`Invalid tier: ${tier}`)
    }
    await this.prisma.user.update({ where: { id: userId }, data: { tier } })
  }

  async getAllUsersUsage() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, displayName: true },
    })

    const perUser = await Promise.all(
      users.map(async (u) => ({ user: u, usage: await this.getUsage(u.id) })),
    )

    return { users: perUser }
  }
}
