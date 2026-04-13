import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { OrgRole, Prisma } from '@prisma/client'
import { Response } from 'express'
import PDFDocument from 'pdfkit'
import { PrismaService } from '../prisma/prisma.service'
import { AuditLogService } from '../audit-log/audit-log.service'
import { CreateOrgDto } from './dto/create-org.dto'
import { UpdateOrgDto } from './dto/update-org.dto'
import { AddMemberDto, UpdateMemberRoleDto } from './dto/add-member.dto'
import { CreateOrgVehicleDto } from './dto/create-org-vehicle.dto'
import { BulkReminderDto } from './dto/bulk-reminder.dto'
import { CostQueryDto } from './dto/cost-query.dto'

// Role hierarchy: OWNER > MANAGER > TECHNICIAN = DRIVER > VIEWER
const ROLE_WEIGHT: Record<OrgRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  TECHNICIAN: 2,
  DRIVER: 2,
  VIEWER: 1,
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  // ── Org CRUD ──────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateOrgDto) {
    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        type: dto.type,
        registrationNumber: dto.registrationNumber,
        country: dto.country ?? 'IS',
        members: {
          create: { userId, role: OrgRole.OWNER },
        },
      },
      include: { members: { include: { user: { select: { id: true, email: true, displayName: true } } } } },
    })
    this.audit.log(userId, 'CREATE', 'ORGANIZATION', org.id)
    return org
  }

  async findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { members: true, vehicles: true } },
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(orgId: string, userId: string) {
    const membership = await this.requireMembership(orgId, userId)
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { members: true, vehicles: true } },
      },
    })
    return { ...org, myRole: membership.role }
  }

  async update(orgId: string, userId: string, dto: UpdateOrgDto) {
    await this.requireRole(orgId, userId, 'MANAGER')
    const org = await this.prisma.organization.update({ where: { id: orgId }, data: dto })
    this.audit.log(userId, 'UPDATE', 'ORGANIZATION', orgId)
    return org
  }

  async remove(orgId: string, userId: string) {
    await this.requireRole(orgId, userId, 'OWNER')
    await this.prisma.organization.delete({ where: { id: orgId } })
    this.audit.log(userId, 'DELETE', 'ORGANIZATION', orgId)
  }

  // ── Members ───────────────────────────────────────────────────────────────

  async listMembers(orgId: string, userId: string) {
    await this.requireMembership(orgId, userId)
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    })
  }

  async addMember(orgId: string, userId: string, dto: AddMemberDto) {
    await this.requireRole(orgId, userId, 'MANAGER')

    const target = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!target) throw new NotFoundException(`No user found with email ${dto.email}`)

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: target.id } },
    })
    if (existing) throw new BadRequestException('User is already a member')

    const member = await this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: target.id,
        role: dto.role ?? OrgRole.DRIVER,
      },
      include: { user: { select: { id: true, email: true, displayName: true } } },
    })
    this.audit.log(userId, 'CREATE', 'ORGANIZATION', orgId)
    return member
  }

  async updateMemberRole(orgId: string, userId: string, targetUserId: string, dto: UpdateMemberRoleDto) {
    await this.requireRole(orgId, userId, 'OWNER')
    if (targetUserId === userId) throw new BadRequestException('Cannot change your own role')
    if (dto.role === OrgRole.OWNER) throw new BadRequestException('Transfer ownership not supported via this endpoint')

    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    })
    if (!member) throw new NotFoundException('Member not found')

    const updated = await this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
      data: { role: dto.role },
    })
    this.audit.log(userId, 'UPDATE', 'ORGANIZATION', orgId)
    return updated
  }

  async removeMember(orgId: string, userId: string, targetUserId: string) {
    await this.requireRole(orgId, userId, 'MANAGER')

    const target = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    })
    if (!target) throw new NotFoundException('Member not found')
    if (target.role === OrgRole.OWNER) throw new ForbiddenException('Cannot remove the org owner')

    await this.prisma.organizationMember.delete({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUserId } },
    })
    this.audit.log(userId, 'DELETE', 'ORGANIZATION', orgId)
  }

  // ── Org Vehicles ──────────────────────────────────────────────────────────

  async listVehicles(orgId: string, userId: string) {
    await this.requireMembership(orgId, userId)
    return this.prisma.vehicle.findMany({
      where: { organizationId: orgId },
      include: {
        mileageLogs: { orderBy: { date: 'desc' }, take: 1 },
        _count: { select: { serviceRecords: true, reminders: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createVehicle(orgId: string, userId: string, dto: CreateOrgVehicleDto) {
    await this.requireRole(orgId, userId, 'MANAGER')
    const vehicle = await this.prisma.vehicle.create({
      data: { ...dto, organizationId: orgId },
    })
    this.audit.log(userId, 'CREATE', 'VEHICLE', vehicle.id)
    return vehicle
  }

  async updateVehicle(orgId: string, userId: string, vehicleId: string, dto: Partial<CreateOrgVehicleDto>) {
    await this.requireRole(orgId, userId, 'MANAGER')
    await this.requireOrgVehicle(orgId, vehicleId)
    const vehicle = await this.prisma.vehicle.update({ where: { id: vehicleId }, data: dto })
    this.audit.log(userId, 'UPDATE', 'VEHICLE', vehicleId)
    return vehicle
  }

  async removeVehicle(orgId: string, userId: string, vehicleId: string) {
    await this.requireRole(orgId, userId, 'MANAGER')
    await this.requireOrgVehicle(orgId, vehicleId)
    await this.prisma.vehicle.delete({ where: { id: vehicleId } })
    this.audit.log(userId, 'DELETE', 'VEHICLE', vehicleId)
  }

  // ── Fleet Dashboard ───────────────────────────────────────────────────────

  async getDashboard(orgId: string, userId: string) {
    await this.requireMembership(orgId, userId)

    const [org, vehicles, upcomingReminders, thisMonthExpenses] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, type: true },
      }),
      this.prisma.vehicle.findMany({
        where: { organizationId: orgId },
        include: {
          mileageLogs: { orderBy: { date: 'desc' }, take: 1 },
          reminders: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' }, take: 3 },
          tripLogs: {
            where: { endMileage: null },
            orderBy: { date: 'desc' },
            take: 1,
            include: { driver: { select: { id: true, displayName: true, email: true } } },
          },
          _count: { select: { serviceRecords: true, expenses: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.reminder.count({
        where: {
          vehicle: { organizationId: orgId },
          status: 'PENDING',
          dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.expense.aggregate({
        where: {
          vehicle: { organizationId: orgId },
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ])

    return {
      org,
      summary: {
        vehicleCount: vehicles.length,
        upcomingRemindersNext30Days: upcomingReminders,
        thisMonthExpenses: thisMonthExpenses._sum.amount ?? 0,
      },
      vehicles: vehicles.map((v) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        licensePlate: v.licensePlate,
        fuelType: v.fuelType,
        latestMileage: v.mileageLogs[0]?.mileage ?? null,
        openTrip: v.tripLogs[0] ?? null,
        upcomingReminders: v.reminders,
        counts: v._count,
      })),
    }
  }

  // ── Cost Reporting ────────────────────────────────────────────────────────

  async getCosts(orgId: string, userId: string, query: CostQueryDto) {
    await this.requireMembership(orgId, userId)

    const where: Prisma.ExpenseWhereInput = {
      vehicle: { organizationId: orgId },
    }
    if (query.vehicleId) where.vehicleId = query.vehicleId
    if (query.category) where.category = query.category
    if (query.from || query.to) {
      where.date = {}
      if (query.from) where.date.gte = new Date(query.from)
      if (query.to) where.date.lte = new Date(query.to)
    }

    const [expenses, byCategory, byVehicle, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { vehicle: { select: { id: true, make: true, model: true, licensePlate: true } } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.expense.groupBy({
        by: ['vehicleId'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ])

    // Enrich vehicle grouping with vehicle details
    const vehicleIds = byVehicle.map((r) => r.vehicleId)
    const vehicleDetails = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, make: true, model: true, licensePlate: true },
    })
    const vehicleMap = Object.fromEntries(vehicleDetails.map((v) => [v.id, v]))

    return {
      total: total._sum.amount ?? 0,
      byCategory: byCategory.map((r) => ({ category: r.category, total: r._sum.amount ?? 0, count: r._count })),
      byVehicle: byVehicle.map((r) => ({
        vehicle: vehicleMap[r.vehicleId],
        total: r._sum.amount ?? 0,
        count: r._count,
      })),
      expenses,
    }
  }

  // ── Bulk Reminders ────────────────────────────────────────────────────────

  async createBulkReminders(orgId: string, userId: string, dto: BulkReminderDto) {
    await this.requireRole(orgId, userId, 'MANAGER')

    const vehicleFilter = dto.vehicleIds?.length
      ? { id: { in: dto.vehicleIds }, organizationId: orgId }
      : { organizationId: orgId }

    const vehicles = await this.prisma.vehicle.findMany({
      where: vehicleFilter,
      select: { id: true },
    })

    if (!vehicles.length) throw new BadRequestException('No matching vehicles found')

    await this.prisma.reminder.createMany({
      data: vehicles.map((v) => ({
        vehicleId: v.id,
        type: dto.type,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        dueMileage: dto.dueMileage ?? null,
        note: dto.note ?? null,
      })),
    })

    return { created: vehicles.length, vehicleIds: vehicles.map((v) => v.id) }
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  async exportCostsCsv(orgId: string, userId: string, query: CostQueryDto): Promise<string> {
    const data = await this.getCosts(orgId, userId, query)

    const rows = [
      ['Date', 'Vehicle', 'License Plate', 'Category', 'Amount (ISK)', 'Description'],
      ...data.expenses.map((e: any) => [
        new Date(e.date).toISOString().split('T')[0],
        `${e.vehicle.make} ${e.vehicle.model}`,
        e.vehicle.licensePlate,
        e.category,
        String(e.amount),
        e.description ?? '',
      ]),
    ]

    return rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
  }

  async exportCostsPdf(orgId: string, userId: string, query: CostQueryDto, res: Response): Promise<void> {
    const data = await this.getCosts(orgId, userId, query)
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    })

    const doc = new PDFDocument({ margin: 50, size: 'A4' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="costs-${orgId}.pdf"`)
    doc.pipe(res)

    // Header
    doc.fontSize(20).text(org!.name, { align: 'left' })
    doc.fontSize(12).fillColor('#666').text('Cost Report', { align: 'left' })
    if (query.from || query.to) {
      doc.text(`Period: ${query.from ?? '—'} to ${query.to ?? '—'}`)
    }
    doc.moveDown()

    // Summary
    doc.fillColor('#000').fontSize(14).text('Summary')
    doc.fontSize(11)
      .text(`Total: ${Number(data.total).toLocaleString('is-IS')} ISK`)
      .text(`Transactions: ${data.expenses.length}`)
    doc.moveDown()

    // By category
    doc.fontSize(14).text('By Category')
    doc.fontSize(10)
    for (const row of data.byCategory as any[]) {
      doc.text(`  ${row.category}: ${Number(row.total).toLocaleString('is-IS')} ISK (${row.count} entries)`)
    }
    doc.moveDown()

    // By vehicle
    doc.fontSize(14).text('By Vehicle')
    doc.fontSize(10)
    for (const row of data.byVehicle as any[]) {
      const v = row.vehicle
      doc.text(`  ${v.make} ${v.model} (${v.licensePlate}): ${Number(row.total).toLocaleString('is-IS')} ISK`)
    }
    doc.moveDown()

    // Expense list
    doc.fontSize(14).text('All Expenses')
    doc.fontSize(9)
    for (const e of data.expenses as any[]) {
      const date = new Date(e.date).toISOString().split('T')[0]
      const amount = Number(e.amount).toLocaleString('is-IS')
      doc.text(`  ${date}  ${e.vehicle.licensePlate}  ${e.category}  ${amount} ISK  ${e.description ?? ''}`)
    }

    doc.end()
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async requireMembership(orgId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } })
    if (!org) throw new NotFoundException('Organization not found')

    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    })
    if (!member) throw new ForbiddenException('Not a member of this organization')
    return member
  }

  private async requireRole(orgId: string, userId: string, minRole: keyof typeof ROLE_WEIGHT) {
    const member = await this.requireMembership(orgId, userId)
    if (ROLE_WEIGHT[member.role] < ROLE_WEIGHT[minRole]) {
      throw new ForbiddenException(`Requires ${minRole} role or higher`)
    }
    return member
  }

  private async requireOrgVehicle(orgId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!vehicle) throw new NotFoundException('Vehicle not found')
    if (vehicle.organizationId !== orgId) throw new ForbiddenException()
    return vehicle
  }
}
