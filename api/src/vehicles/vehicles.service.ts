import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { VehicleAuthzService } from '../authz/vehicle-authz.service';
import { MailService } from '../mail/mail.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { paginate, type Paginated } from '../common/dto/pagination.dto';

const LINKED_DOCUMENT_SELECT = {
  id: true,
  vehicleId: true,
  serviceRecordId: true,
  expenseId: true,
  type: true,
  label: true,
  fileUrl: true,
  fileSizeBytes: true,
  createdAt: true,
} as const

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly audit: AuditLogService,
    private readonly vehicleAuthz: VehicleAuthzService,
    private readonly mail: MailService,
  ) {}

  async findAll(userId: string, page: number, limit: number, archived = false): Promise<Paginated<ReturnType<typeof this.toListItem>>> {
    const skip = (page - 1) * limit
    const where = archived
      ? { userId, archivedAt: { not: null } }
      : { userId, archivedAt: null }
    const [vehicles, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        include: {
          _count: {
            select: {
              serviceRecords: { where: { deletedAt: null } },
              documents: { where: { deletedAt: null } },
              reminders: { where: { deletedAt: null } },
            },
          },
          mileageLogs: { where: { deletedAt: null }, orderBy: { mileage: 'desc' }, take: 1 },
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
    try {
      const vehicle = await this.prisma.vehicle.create({ data: { ...dto, userId } });
      this.audit.log(userId, 'CREATE', 'VEHICLE', vehicle.id);
      return vehicle;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const fields = (e.meta?.target as string[] | undefined) ?? [];
        if (fields.includes('vin')) throw new ConflictException('A vehicle with this VIN already exists');
        throw new ConflictException('A vehicle with this license plate already exists');
      }
      throw e;
    }
  }

  async update(id: string, userId: string, dto: UpdateVehicleDto) {
    await this.vehicleAuthz.requireEdit(id, userId);
    const data: any = { ...dto }
    // Disposing a vehicle auto-archives it
    if (dto.disposedAt && !data.archivedAt) {
      data.archivedAt = new Date()
    }
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data });
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
        serviceRecords: { where: { deletedAt: null }, orderBy: { date: 'desc' }, take: 1 },
        reminders: {
          where: { status: 'PENDING', deletedAt: null },
          orderBy: { dueDate: 'asc' },
          take: 5,
        },
        mileageLogs: { where: { deletedAt: null }, orderBy: { mileage: 'desc' } },
        _count: {
          select: {
            serviceRecords: { where: { deletedAt: null } },
            documents: { where: { deletedAt: null } },
            expenses: { where: { deletedAt: null } },
            reminders: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.vehicleAuthz.assertView(vehicle, userId);

    const latestMileage = vehicle.mileageLogs[0]?.mileage ?? null;
    const estimate = this.estimateCurrentMileage(vehicle.mileageLogs);

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
      estimatedMileage: estimate?.mileage ?? null,
      estimatedDailyKm: estimate?.dailyKm ?? null,
      latestService: vehicle.serviceRecords[0]
        ? {
            id: vehicle.serviceRecords[0].id,
            types: vehicle.serviceRecords[0].types,
            customType: vehicle.serviceRecords[0].customType,
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

  async getTimeline(id: string, userId: string, page: number, limit: number) {
    await this.vehicleAuthz.requireView(id, userId);

    const [serviceRecords, expenses, mileageLogs] = await Promise.all([
      this.prisma.serviceRecord.findMany({
        where: { vehicleId: id, deletedAt: null },
        include: {
          documents: {
            where: { deletedAt: null },
            select: LINKED_DOCUMENT_SELECT,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.expense.findMany({
        where: { vehicleId: id, deletedAt: null },
        include: {
          documents: {
            where: { deletedAt: null },
            select: LINKED_DOCUMENT_SELECT,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.prisma.mileageLog.findMany({ where: { vehicleId: id, deletedAt: null } }),
    ]);

    const all = [
      ...serviceRecords.map((r) => ({
        id: r.id,
        vehicleId: id,
        entryType: 'SERVICE' as const,
        date: r.date.toISOString(),
        types: r.types,
        customType: r.customType,
        mileage: r.mileage,
        cost: r.cost != null ? r.cost.toString() : null,
        shop: r.shop ?? null,
        description: r.description ?? null,
        documents: r.documents,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        vehicleId: id,
        entryType: 'EXPENSE' as const,
        date: e.date.toISOString(),
        category: e.category,
        amount: e.amount != null ? e.amount.toString() : null,
        description: e.description ?? null,
        litres: e.litres != null ? e.litres.toString() : null,
        customCategory: e.customCategory ?? null,
        recurringMonths: e.recurringMonths ?? null,
        documents: e.documents,
      })),
      ...mileageLogs.map((m) => ({
        id: m.id,
        vehicleId: id,
        entryType: 'MILEAGE' as const,
        date: m.date.toISOString(),
        mileage: m.mileage,
        note: m.note ?? null,
      })),
    ];

    all.sort((a, b) => b.date.localeCompare(a.date));

    const total = all.length;
    const items = all.slice((page - 1) * limit, page * limit);
    return paginate(items, total, page, limit);
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

  // ── Vehicle Transfer ─────────────────────────────────────────────────────────

  async initiateTransfer(vehicleId: string, userId: string, dto: CreateTransferDto) {
    const vehicle = await this.vehicleAuthz.requireEdit(vehicleId, userId)

    // Cancel any existing pending transfer for this vehicle
    await this.prisma.vehicleTransfer.updateMany({
      where: { vehicleId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    })

    const fromUser = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    const fromOrgId = vehicle.organizationId ?? undefined

    // Validate toOrgId if provided
    if (dto.toOrgId) {
      const org = await this.prisma.organization.findUnique({ where: { id: dto.toOrgId } })
      if (!org) throw new NotFoundException('Target organization not found')
    }

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const transfer = await this.prisma.vehicleTransfer.create({
      data: {
        vehicleId,
        fromUserId: fromUser ? userId : null,
        fromOrgId: fromOrgId ?? null,
        toEmail: dto.toEmail,
        toOrgId: dto.toOrgId ?? null,
        tokenHash,
        expiresAt,
      },
    })

    const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`
    const link = `${process.env.WEB_URL ?? 'http://localhost:3000'}/transfers/accept?token=${rawToken}`
    await this.mail.sendRaw(
      dto.toEmail,
      `Smurbók: Vehicle transfer — ${vehicleName}`,
      `<p>You have been invited to take ownership of <strong>${vehicleName}</strong>.</p>
       <p><a href="${link}">Accept transfer</a> — link expires in 7 days.</p>
       <p>If you did not expect this, you can ignore this email.</p>`,
    )

    this.audit.log(userId, 'UPDATE', 'VEHICLE', vehicleId)
    return { transferId: transfer.id, expiresAt }
  }

  async checkTransfer(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const transfer = await this.prisma.vehicleTransfer.findUnique({
      where: { tokenHash },
      include: { vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } } },
    })
    if (!transfer) throw new NotFoundException('Transfer not found')
    if (transfer.status !== 'PENDING') return { valid: false, status: transfer.status }
    if (transfer.expiresAt < new Date()) {
      await this.prisma.vehicleTransfer.update({ where: { id: transfer.id }, data: { status: 'EXPIRED' } })
      return { valid: false, status: 'EXPIRED' }
    }
    return {
      valid: true,
      status: transfer.status,
      vehicle: transfer.vehicle,
      toEmail: transfer.toEmail,
      expiresAt: transfer.expiresAt,
    }
  }

  async acceptTransfer(token: string, userId: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const transfer = await this.prisma.vehicleTransfer.findUnique({ where: { tokenHash } })
    if (!transfer) throw new NotFoundException('Transfer not found')
    if (transfer.status !== 'PENDING') throw new BadRequestException(`Transfer is already ${transfer.status.toLowerCase()}`)
    if (transfer.expiresAt < new Date()) {
      await this.prisma.vehicleTransfer.update({ where: { id: transfer.id }, data: { status: 'EXPIRED' } })
      throw new BadRequestException('Transfer link has expired')
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user || !transfer.toEmail || user.email.toLowerCase() !== transfer.toEmail.toLowerCase()) {
      throw new ForbiddenException('This transfer was sent to a different email address')
    }

    // Determine new owner: org or personal
    const vehicleUpdate: any = { userId: null, organizationId: null }
    if (transfer.toOrgId) {
      // Verify accepting user is a member of the target org
      const membership = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: transfer.toOrgId, userId } },
      })
      if (!membership) throw new ForbiddenException('You are not a member of the target organization')
      vehicleUpdate.organizationId = transfer.toOrgId
    } else {
      vehicleUpdate.userId = userId
    }

    await this.prisma.$transaction([
      this.prisma.vehicle.update({ where: { id: transfer.vehicleId }, data: vehicleUpdate }),
      this.prisma.vehicleTransfer.update({ where: { id: transfer.id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } }),
    ])

    this.audit.log(userId, 'UPDATE', 'VEHICLE', transfer.vehicleId)
    return { accepted: true, vehicleId: transfer.vehicleId }
  }

  async declineTransfer(token: string, userId: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const transfer = await this.prisma.vehicleTransfer.findUnique({ where: { tokenHash } })
    if (!transfer) throw new NotFoundException('Transfer not found')
    if (transfer.status !== 'PENDING') throw new BadRequestException(`Transfer is already ${transfer.status.toLowerCase()}`)

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (!user || !transfer.toEmail || user.email.toLowerCase() !== transfer.toEmail.toLowerCase()) {
      throw new ForbiddenException('This transfer was sent to a different email address')
    }

    await this.prisma.vehicleTransfer.update({
      where: { id: transfer.id },
      data: { status: 'DECLINED', declinedAt: new Date() },
    })
    return { declined: true }
  }

  async listPendingTransfers(vehicleId: string, userId: string) {
    await this.vehicleAuthz.requireEdit(vehicleId, userId)
    return this.prisma.vehicleTransfer.findMany({
      where: { vehicleId, status: 'PENDING' },
      select: { id: true, toEmail: true, toOrgId: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async cancelTransfer(transferId: string, userId: string) {
    const transfer = await this.prisma.vehicleTransfer.findUnique({ where: { id: transferId } })
    if (!transfer) throw new NotFoundException('Transfer not found')
    if (transfer.status !== 'PENDING') throw new BadRequestException('Transfer is no longer pending')
    await this.vehicleAuthz.requireEdit(transfer.vehicleId, userId)
    await this.prisma.vehicleTransfer.update({ where: { id: transferId }, data: { status: 'EXPIRED' } })
    return { cancelled: true }
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private estimateCurrentMileage(logs: { mileage: number; date: Date }[]): { mileage: number; dailyKm: number } | null {
    if (logs.length === 0) return null;

    const sorted = [...logs].sort((a, b) => a.date.getTime() - b.date.getTime());
    const latest = sorted[sorted.length - 1];

    const DEFAULT_KM_PER_DAY = 12_000 / 365;
    const MIN_DAYS_FOR_RATE = 7;

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
    return {
      mileage: Math.round(latest.mileage + daysSinceLatest * kmPerDay),
      dailyKm: Math.round(kmPerDay * 10) / 10,
    };
  }

  async exportServiceHistoryPdf(vehicleId: string, userId: string, res: Response): Promise<void> {
    const vehicle = await this.vehicleAuthz.requireView(vehicleId, userId)

    const [serviceRecords, expenses, mileageLogs] = await Promise.all([
      this.prisma.serviceRecord.findMany({
        where: { vehicleId, deletedAt: null },
        orderBy: { date: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: { vehicleId, deletedAt: null },
        orderBy: { date: 'asc' },
      }),
      this.prisma.mileageLog.findMany({
        where: { vehicleId, deletedAt: null },
        orderBy: { date: 'asc' },
      }),
    ])

    const veh = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    const vehicleName = `${veh!.year} ${veh!.make} ${veh!.model}`
    const latestMileage = mileageLogs.at(-1)?.mileage ?? null

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="service-history-${veh!.licensePlate}.pdf"`)
    doc.pipe(res)

    // Header
    doc.fontSize(20).text(vehicleName)
    doc.fontSize(12).fillColor('#666').text(`${veh!.licensePlate}${veh!.vin ? ' · VIN: ' + veh!.vin : ''}`)
    if (latestMileage) doc.text(`Latest recorded mileage: ${latestMileage.toLocaleString('is-IS')} km`)
    doc.text(`Exported: ${new Date().toISOString().split('T')[0]}`).fillColor('#000')
    doc.moveDown()

    // Service records
    doc.fontSize(14).text('Service Records')
    doc.moveDown(0.3)
    if (serviceRecords.length === 0) {
      doc.fontSize(10).fillColor('#888').text('  No service records').fillColor('#000')
    } else {
      doc.fontSize(9)
      for (const r of serviceRecords) {
        const date = r.date.toISOString().split('T')[0]
        const cost = r.cost ? ` · ${Number(r.cost).toLocaleString('is-IS')} ISK` : ''
        const shop = r.shop ? ` · ${r.shop}` : ''
        doc.text(`  ${date}  ${r.mileage.toLocaleString('is-IS')} km  ${(r.customType ?? r.types.join(', ')).replace(/_/g, ' ')}${shop}${cost}`)
        if (r.description) doc.fillColor('#555').text(`    ${r.description}`).fillColor('#000')
      }
    }
    doc.moveDown()

    // Expenses
    doc.fontSize(14).text('Expenses')
    doc.moveDown(0.3)
    if (expenses.length === 0) {
      doc.fontSize(10).fillColor('#888').text('  No expenses').fillColor('#000')
    } else {
      const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
      doc.fontSize(9)
      for (const e of expenses) {
        const date = e.date.toISOString().split('T')[0]
        const litres = e.litres ? ` · ${Number(e.litres)} L` : ''
        doc.text(`  ${date}  ${e.category}  ${Number(e.amount).toLocaleString('is-IS')} ISK${litres}  ${e.description ?? ''}`)
      }
      doc.moveDown(0.3).fontSize(10).text(`  Total: ${total.toLocaleString('is-IS')} ISK`)
    }

    doc.end()
  }

  async getFuelEfficiency(vehicleId: string, userId: string, from?: string, to?: string) {
    await this.vehicleAuthz.requireView(vehicleId, userId)

    const dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0

    const [fuelExpenses, mileageLogs] = await Promise.all([
      this.prisma.expense.findMany({
        where: { vehicleId, category: 'FUEL', litres: { not: null }, deletedAt: null, ...(hasDateFilter && { date: dateFilter }) },
        select: { litres: true, date: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.mileageLog.findMany({
        where: { vehicleId, deletedAt: null, ...(hasDateFilter && { date: dateFilter }) },
        select: { mileage: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ])

    if (fuelExpenses.length === 0 || mileageLogs.length < 2) {
      return { kmPerLitre: null, litresPer100km: null, totalKm: null, totalLitres: null, dataPoints: fuelExpenses.length, insufficientData: true }
    }

    const totalLitres = fuelExpenses.reduce((sum, e) => sum + Number(e.litres), 0)
    const totalKm = mileageLogs[mileageLogs.length - 1].mileage - mileageLogs[0].mileage

    if (totalLitres === 0 || totalKm <= 0) {
      return { kmPerLitre: null, litresPer100km: null, totalKm, totalLitres, dataPoints: fuelExpenses.length, insufficientData: true }
    }

    const kmPerLitre = Math.round((totalKm / totalLitres) * 100) / 100
    const litresPer100km = Math.round((totalLitres / totalKm * 100) * 100) / 100

    return {
      kmPerLitre,
      litresPer100km,
      totalKm,
      totalLitres: Math.round(totalLitres * 100) / 100,
      dataPoints: fuelExpenses.length,
      period: { from: mileageLogs[0].date, to: mileageLogs[mileageLogs.length - 1].date },
      insufficientData: false,
    }
  }

  private toListItem(vehicle: any) {
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin ?? null,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      latestMileage: vehicle.mileageLogs[0]?.mileage ?? null,
      archivedAt: vehicle.archivedAt?.toISOString() ?? null,
      counts: vehicle._count,
    };
  }
}
