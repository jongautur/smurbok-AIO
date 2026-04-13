import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VehicleAuthzService } from '../authz/vehicle-authz.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { paginate, type Paginated } from '../common/dto/pagination.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly audit: AuditLogService,
    private readonly vehicleAuthz: VehicleAuthzService,
  ) {}

  async findAll(userId: string, page: number, limit: number): Promise<Paginated<ReturnType<typeof this.toListItem>>> {
    const skip = (page - 1) * limit
    const where = { userId, archivedAt: null }
    const [vehicles, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: {
          _count: { select: { serviceRecords: true, documents: true, reminders: true } },
          mileageLogs: { orderBy: { mileage: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return paginate(vehicles.map((v) => this.toListItem(v)), total, page, limit);
  }

  async archive(id: string, userId: string) {
    await this.vehicleAuthz.requireEdit(id, userId);
    return this.prisma.vehicle.update({ where: { id }, data: { archivedAt: new Date() } });
  }

  async restore(id: string, userId: string) {
    await this.vehicleAuthz.requireEdit(id, userId);
    return this.prisma.vehicle.update({ where: { id }, data: { archivedAt: null } });
  }

  async undelete(id: string, userId: string) {
    // Explicitly passing deletedAt in where prevents the soft-delete middleware
    // from overriding it with `null`, allowing us to find the deleted record.
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id, deletedAt: { not: null } },
    });
    if (!vehicle) throw new NotFoundException('Deleted vehicle not found');
    await this.vehicleAuthz.assertEdit(vehicle, userId);
    return this.prisma.vehicle.update({ where: { id }, data: { deletedAt: null } });
  }

  async findOne(id: string, userId: string) {
    return this.vehicleAuthz.requireView(id, userId);
  }

  async create(userId: string, dto: CreateVehicleDto) {
    await this.storageService.enforceVehicleLimit(userId);
    const vehicle = await this.prisma.vehicle.create({ data: { ...dto, userId } });
    this.audit.log(userId, 'CREATE', 'VEHICLE', vehicle.id);
    return vehicle;
  }

  async update(id: string, userId: string, dto: UpdateVehicleDto) {
    await this.vehicleAuthz.requireEdit(id, userId);
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data: dto });
    this.audit.log(userId, 'UPDATE', 'VEHICLE', id);
    return vehicle;
  }

  async remove(id: string, userId: string) {
    await this.vehicleAuthz.requireEdit(id, userId);
    await this.prisma.vehicle.delete({ where: { id } });
    this.audit.log(userId, 'DELETE', 'VEHICLE', id);
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
        mileageLogs: { orderBy: { mileage: 'desc' } },
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
    await this.vehicleAuthz.assertView(vehicle, userId);

    const latestMileage = vehicle.mileageLogs[0]?.mileage ?? null;
    const estimatedMileage = this.estimateCurrentMileage(vehicle.mileageLogs);

    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      latestMileage,
      estimatedMileage,
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
    await this.vehicleAuthz.requireView(id, userId);

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

  async lookup(query: { licensePlate?: string; vin?: string }, userId: string) {
    if (!query.licensePlate && !query.vin) {
      throw new BadRequestException('Provide licensePlate or vin')
    }

    // Only workshop members and admins may look up arbitrary vehicles by plate/VIN.
    // This prevents any authenticated user from enumerating vehicles they don't own.
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (user?.role !== Role.ADMIN) {
      const workshopMembership = await this.prisma.organizationMember.findFirst({
        where: { userId, organization: { type: 'WORKSHOP' } },
      })
      if (!workshopMembership) {
        throw new ForbiddenException('Vehicle lookup is restricted to workshop members')
      }
    }

    const normalizedPlate = query.licensePlate?.toUpperCase().replace(/[\s-]/g, '')
    const normalizedVin = query.vin?.toUpperCase()

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        ...(normalizedPlate ? { licensePlate: normalizedPlate } : {}),
        ...(normalizedVin ? { vin: normalizedVin } : {}),
      },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        licensePlate: true,
        vin: true,
        fuelType: true,
      },
    })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    return vehicle
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private estimateCurrentMileage(logs: { mileage: number; date: Date }[]): number | null {
    if (logs.length === 0) return null;

    // Sort ascending by date to find oldest→newest span
    const sorted = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const latest = sorted[sorted.length - 1];

    const DEFAULT_KM_PER_DAY = 15_000 / 365;
    const MIN_DAYS_FOR_RATE = 30;

    let kmPerDay = DEFAULT_KM_PER_DAY;
    if (sorted.length >= 2) {
      const oldest = sorted[0];
      const daysDiff = (latest.date.getTime() - oldest.date.getTime()) / 86_400_000;
      if (daysDiff >= MIN_DAYS_FOR_RATE) {
        const calculated = (latest.mileage - oldest.mileage) / daysDiff;
        if (calculated > 0) kmPerDay = calculated;
      }
    }

    const daysSinceLatest = Math.max(0, (Date.now() - latest.date.getTime()) / 86_400_000);
    return Math.round(latest.mileage + daysSinceLatest * kmPerDay);
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
