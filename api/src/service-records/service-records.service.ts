import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';

@Injectable()
export class ServiceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForVehicle(vehicleId: string, userId: string) {
    await this.requireVehicleOwned(vehicleId, userId);

    const records = await this.prisma.serviceRecord.findMany({
      where: { vehicleId },
      orderBy: { date: 'desc' },
    });

    return records.map((r) => this.toResponse(r));
  }

  async create(vehicleId: string, userId: string, dto: CreateServiceRecordDto) {
    await this.requireVehicleOwned(vehicleId, userId);

    const record = await this.prisma.serviceRecord.create({
      data: {
        vehicleId,
        type: dto.type,
        mileage: dto.mileage,
        date: new Date(dto.date),
        description: dto.description,
        cost: dto.cost,
        shop: dto.shop,
      },
    });

    return this.toResponse(record);
  }

  async update(id: string, userId: string, dto: UpdateServiceRecordDto) {
    await this.requireRecordOwned(id, userId);

    const record = await this.prisma.serviceRecord.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });

    return this.toResponse(record);
  }

  async remove(id: string, userId: string) {
    await this.requireRecordOwned(id, userId);
    await this.prisma.serviceRecord.delete({ where: { id } });
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private async requireVehicleOwned(vehicleId: string, userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (vehicle.userId !== userId) throw new ForbiddenException();
  }

  private async requireRecordOwned(id: string, userId: string) {
    const record = await this.prisma.serviceRecord.findUnique({
      where: { id },
      include: { vehicle: { select: { userId: true } } },
    });
    if (!record) throw new NotFoundException('Service record not found');
    if (record.vehicle.userId !== userId) throw new ForbiddenException();
    return record;
  }

  private toResponse(record: any) {
    return {
      id: record.id,
      vehicleId: record.vehicleId,
      type: record.type,
      mileage: record.mileage,
      date: record.date,
      description: record.description,
      cost: record.cost,
      shop: record.shop,
      createdAt: record.createdAt,
    };
  }
}
