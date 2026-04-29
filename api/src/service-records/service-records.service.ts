import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VehicleAuthzService } from '../authz/vehicle-authz.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { paginate, type Paginated } from '../common/dto/pagination.dto';

@Injectable()
export class ServiceRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly vehicleAuthz: VehicleAuthzService,
  ) {}

  async findAllForVehicle(vehicleId: string, userId: string, page: number, limit: number): Promise<Paginated<ReturnType<typeof this.toResponse>>> {
    await this.vehicleAuthz.requireView(vehicleId, userId);
    const skip = (page - 1) * limit
    const where = { vehicleId }
    const [records, total] = await this.prisma.$transaction([
      this.prisma.serviceRecord.findMany({ where, orderBy: { date: 'desc' }, skip, take: limit }),
      this.prisma.serviceRecord.count({ where }),
    ]);
    return paginate(records.map((r) => this.toResponse(r)), total, page, limit);
  }

  async create(vehicleId: string, userId: string, dto: CreateServiceRecordDto) {
    await this.vehicleAuthz.requireEdit(vehicleId, userId);

    const date = new Date(dto.date);

    const record = await this.prisma.serviceRecord.create({
      data: {
        vehicleId,
        types: dto.types,
        customType: dto.customType,
        mileage: dto.mileage,
        date,
        description: dto.description,
        cost: dto.cost,
        shop: dto.shop,
      },
    });

    await this.syncMileageLog(vehicleId, dto.mileage, date);
    this.audit.log(userId, 'CREATE', 'SERVICE_RECORD', record.id);
    return this.toResponse(record);
  }

  async update(id: string, userId: string, dto: UpdateServiceRecordDto) {
    const existing = await this.prisma.serviceRecord.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Service record not found');
    await this.vehicleAuthz.requireEdit(existing.vehicleId, userId);

    const record = await this.prisma.serviceRecord.update({
      where: { id },
      data: {
        types: dto.types,
        customType: dto.customType,
        mileage: dto.mileage,
        date: dto.date ? new Date(dto.date) : undefined,
        description: dto.description,
        cost: dto.cost,
        shop: dto.shop,
      },
    });

    this.audit.log(userId, 'UPDATE', 'SERVICE_RECORD', id);
    return this.toResponse(record);
  }

  async remove(id: string, userId: string) {
    const record = await this.prisma.serviceRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Service record not found');
    await this.vehicleAuthz.requireEdit(record.vehicleId, userId);
    await this.prisma.serviceRecord.delete({ where: { id } });
    this.audit.log(userId, 'DELETE', 'SERVICE_RECORD', id);
  }

  async undelete(id: string, userId: string) {
    const record = await this.prisma.serviceRecord.findUnique({
      where: { id, deletedAt: { not: null } },
    });
    if (!record) throw new NotFoundException('Deleted service record not found');
    await this.vehicleAuthz.requireEdit(record.vehicleId, userId);
    const restored = await this.prisma.serviceRecord.update({ where: { id }, data: { deletedAt: null } });
    this.audit.log(userId, 'UPDATE', 'SERVICE_RECORD', id);
    return this.toResponse(restored);
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  /**
   * Creates a MileageLog entry if `mileage` exceeds the vehicle's current highest
   * recorded odometer value. Silently skips if mileage is lower or equal.
   */
  private async syncMileageLog(vehicleId: string, mileage: number, date: Date) {
    const latest = await this.prisma.mileageLog.findFirst({
      where: { vehicleId },
      orderBy: { mileage: 'desc' },
      select: { mileage: true },
    });
    if (latest && latest.mileage >= mileage) return;
    await this.prisma.mileageLog.create({
      data: { vehicleId, mileage, date },
    });
  }

  private toResponse(record: any) {
    return {
      id: record.id,
      vehicleId: record.vehicleId,
      types: record.types,
      customType: record.customType,
      mileage: record.mileage,
      date: record.date,
      description: record.description,
      cost: record.cost,
      shop: record.shop,
      createdAt: record.createdAt,
    };
  }
}
