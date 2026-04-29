import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        mileageLogs: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 1 },
        _count: { select: { serviceRecords: { where: { deletedAt: null } } } },
      },
    })

    const vehicleIds = vehicles.map((v) => v.id)

    const [upcomingReminders, recentActivity] = await Promise.all([
      this.prisma.reminder.findMany({
        where: {
          vehicleId: { in: vehicleIds },
          status: 'PENDING',
          deletedAt: null,
        },
        include: { vehicle: { select: { make: true, model: true, year: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      this.prisma.serviceRecord.findMany({
        where: { vehicleId: { in: vehicleIds }, deletedAt: null },
        include: { vehicle: { select: { make: true, model: true, year: true } } },
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ])

    const now = new Date()

    return {
      counts: {
        vehicles: vehicles.length,
        totalServiceRecords: vehicles.reduce((s, v) => s + v._count.serviceRecords, 0),
        pendingReminders: upcomingReminders.length,
        overdueReminders: upcomingReminders.filter(
          (r) => r.dueDate && r.dueDate < now,
        ).length,
      },
      vehicles: vehicles.map((v) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        licensePlate: v.licensePlate,
        latestMileage: v.mileageLogs[0]?.mileage ?? null,
      })),
      upcomingReminders: upcomingReminders.map((r) => ({
        id: r.id,
        vehicleId: r.vehicleId,
        vehicleName: `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`,
        type: r.type,
        dueDate: r.dueDate,
        dueMileage: r.dueMileage,
        status: r.status,
        isOverdue: r.dueDate ? r.dueDate < now : false,
      })),
      recentActivity: recentActivity.map((r) => ({
        id: r.id,
        vehicleId: r.vehicleId,
        vehicleName: `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}`,
        types: r.types,
        customType: r.customType,
        date: r.date,
        mileage: r.mileage,
        shop: r.shop,
      })),
    }
  }
}
