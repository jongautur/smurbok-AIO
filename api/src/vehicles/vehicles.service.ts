import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      include: {
        _count: { select: { serviceRecords: true, documents: true, reminders: true } },
        mileageLogs: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return vehicles.map((v) => this.toListItem(v));
  }

  async findOne(id: string, userId: string) {
    const vehicle = await this.requireOwned(id, userId);
    return vehicle;
  }

  async create(userId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data: { ...dto, userId } });
  }

  async update(id: string, userId: string, dto: UpdateVehicleDto) {
    await this.requireOwned(id, userId);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.requireOwned(id, userId);
    await this.prisma.vehicle.delete({ where: { id } });
  }

  async getOverview(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        serviceRecords: { orderBy: { date: 'desc' }, take: 1 },
        reminders: {
          where: { status: 'PENDING' },
          orderBy: { dueDate: 'asc' },
          take: 5,
        },
        mileageLogs: { orderBy: { date: 'desc' }, take: 1 },
        _count: {
          select: {
            serviceRecords: true,
            documents: true,
            expenses: true,
            reminders: true,
          },
        },
      },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.userId !== userId) throw new ForbiddenException();

    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      latestMileage: vehicle.mileageLogs[0]?.mileage ?? null,
      latestService: vehicle.serviceRecords[0]
        ? {
            id: vehicle.serviceRecords[0].id,
            type: vehicle.serviceRecords[0].type,
            date: vehicle.serviceRecords[0].date,
            mileage: vehicle.serviceRecords[0].mileage,
            shop: vehicle.serviceRecords[0].shop,
          }
        : null,
      upcomingReminders: vehicle.reminders.map((r) => ({
        id: r.id,
        type: r.type,
        dueDate: r.dueDate,
        dueMileage: r.dueMileage,
        status: r.status,
      })),
      counts: vehicle._count,
    };
  }

  async getTimeline(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.userId !== userId) throw new ForbiddenException();

    const [serviceRecords, expenses, mileageLogs] = await Promise.all([
      this.prisma.serviceRecord.findMany({ where: { vehicleId: id } }),
      this.prisma.expense.findMany({ where: { vehicleId: id } }),
      this.prisma.mileageLog.findMany({ where: { vehicleId: id } }),
    ]);

    type TimelineEntry = {
      id: string;
      type: 'service_record' | 'expense' | 'mileage_log';
      date: Date;
      title: string;
      mileage: number | null;
      meta: Record<string, unknown>;
    };

    const entries: TimelineEntry[] = [
      ...serviceRecords.map((r) => ({
        id: r.id,
        type: 'service_record' as const,
        date: r.date,
        title: r.type,
        mileage: r.mileage,
        meta: { cost: r.cost, shop: r.shop, description: r.description },
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        date: e.date,
        title: e.category,
        mileage: null,
        meta: { amount: e.amount, description: e.description },
      })),
      ...mileageLogs.map((m) => ({
        id: m.id,
        type: 'mileage_log' as const,
        date: m.date,
        title: 'MILEAGE_LOG',
        mileage: m.mileage,
        meta: { note: m.note },
      })),
    ];

    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    return { vehicleId: id, data: entries };
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private async requireOwned(id: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.userId !== userId) throw new ForbiddenException();
    return vehicle;
  }

  private toListItem(vehicle: any) {
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.licensePlate,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      latestMileage: vehicle.mileageLogs[0]?.mileage ?? null,
      counts: vehicle._count,
    };
  }
}
