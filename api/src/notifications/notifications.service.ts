import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { createElement } from 'react'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { ReminderDueEmail } from '../mail/templates/reminder-due.email'
import { WorkOrderCompletedEmail } from '../mail/templates/work-order-completed.email'
import { WorkOrderSignedEmail } from '../mail/templates/work-order-signed.email'
import { copy, reminderTypeLabels, stageLabels, type Lang } from '../mail/templates/translations'

const DEFAULT_KM_PER_YEAR = 15_000
const DEFAULT_KM_PER_DAY = DEFAULT_KM_PER_YEAR / 365
const MIN_DAYS_FOR_RATE = 30 // need at least 30 days of history to trust the rate


interface StageConfig {
  daysOffset: number
  flag: 'notified14Days' | 'notified7Days' | 'notifiedDueDate'
  label: string
}

const STAGES: StageConfig[] = [
  { daysOffset: 14, flag: 'notified14Days', label: 'due in 14 days' },
  { daysOffset: 7,  flag: 'notified7Days',  label: 'due in 7 days' },
  { daysOffset: 0,  flag: 'notifiedDueDate', label: 'due today' },
]

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ── Cron: daily reminder check at 08:00 ──────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDailyReminderEmails() {
    const reminders = await this.prisma.reminder.findMany({
      where: {
        status: 'PENDING',
        deletedAt: null,
        vehicle: { userId: { not: null }, deletedAt: null },
      },
      include: {
        vehicle: {
          include: {
            user: true,
            mileageLogs: { where: { deletedAt: null }, orderBy: { date: 'asc' } },
          },
        },
      },
    })

    this.logger.log(`Daily reminder check: ${reminders.length} pending reminders`)

    for (const reminder of reminders) {
      const user = reminder.vehicle.user
      if (!user?.email || !user.emailNotifications) continue

      const effectiveDueDate = this.resolveEffectiveDueDate(reminder, reminder.vehicle.mileageLogs)
      if (!effectiveDueDate) continue

      for (const stage of STAGES) {
        if (reminder[stage.flag]) continue // already sent

        const triggerDate = new Date(effectiveDueDate)
        triggerDate.setDate(triggerDate.getDate() - stage.daysOffset)

        if (!this.isToday(triggerDate)) continue

        const lang = (user.language ?? 'en') as Lang
        const typeLabel = reminderTypeLabels[reminder.type]?.[lang] ?? reminder.type.replace(/_/g, ' ')
        const stageLabel = stageLabels[stage.daysOffset][lang]
        const subject = stage.daysOffset === 0
          ? copy.reminder.subjectToday(lang, typeLabel, reminder.vehicle.licensePlate)
          : copy.reminder.subjectDays(lang, stage.daysOffset, typeLabel, reminder.vehicle.licensePlate)

        await this.mail.send(
          user.email,
          subject,
          createElement(ReminderDueEmail, {
            lang,
            userName: user.displayName ?? user.email,
            vehicleName: `${reminder.vehicle.make} ${reminder.vehicle.model} ${reminder.vehicle.year}`,
            licensePlate: reminder.vehicle.licensePlate,
            reminderType: typeLabel,
            dueDate: effectiveDueDate.toISOString().split('T')[0],
            dueMileage: reminder.dueMileage ?? undefined,
            stage: stageLabel,
            note: reminder.note ?? undefined,
          }),
        )

        if (user.expoPushToken) {
          await this.sendPush(
            user.expoPushToken,
            subject,
            `${reminder.vehicle.make} ${reminder.vehicle.model} · ${reminder.vehicle.licensePlate}`,
            { reminderId: reminder.id, vehicleId: reminder.vehicleId },
          )
        }

        await this.prisma.reminder.update({
          where: { id: reminder.id },
          data: { [stage.flag]: true },
        })

        this.logger.log(`Sent reminder email (${stageLabel}) to ${user.email} for reminder ${reminder.id}`)
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Resolves the effective due date for a reminder.
   * - If dueDate is set: use it
   * - If dueMileage is set: estimate from mileage rate
   * - If both: use whichever comes first
   */
  private resolveEffectiveDueDate(
    reminder: { dueDate: Date | null; dueMileage: number | null },
    mileageLogs: { mileage: number; date: Date }[],
  ): Date | null {
    const dates: Date[] = []

    if (reminder.dueDate) {
      dates.push(reminder.dueDate)
    }

    if (reminder.dueMileage !== null && mileageLogs.length > 0) {
      const estimated = this.estimateDateForMileage(reminder.dueMileage, mileageLogs)
      if (estimated) dates.push(estimated)
    }

    if (dates.length === 0) return null
    return dates.sort((a, b) => a.getTime() - b.getTime())[0]
  }

  /**
   * Estimates the calendar date when a vehicle will reach targetMileage.
   * Projects from the estimated mileage TODAY (latest log + elapsed days × km/day rate),
   * so the cron fires based on where we estimate the car is now — not from the log date.
   * Falls back to 15,000 km/year if less than 30 days of history exists.
   */
  private estimateDateForMileage(
    targetMileage: number,
    mileageLogs: { mileage: number; date: Date }[],
  ): Date | null {
    const sorted = [...mileageLogs].sort((a, b) => a.date.getTime() - b.date.getTime())
    const latest = sorted[sorted.length - 1]

    let kmPerDay = DEFAULT_KM_PER_DAY

    if (sorted.length >= 2) {
      const oldest = sorted[0]
      const daysDiff = (latest.date.getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff >= MIN_DAYS_FOR_RATE) {
        const calculated = (latest.mileage - oldest.mileage) / daysDiff
        if (calculated > 0) kmPerDay = calculated
      }
    }

    const daysSinceLatest = (Date.now() - latest.date.getTime()) / (1000 * 60 * 60 * 24)
    const estimatedCurrentMileage = latest.mileage + daysSinceLatest * kmPerDay

    // Already at or past the target based on estimated current position
    if (estimatedCurrentMileage >= targetMileage) return new Date()

    const daysUntilTarget = (targetMileage - estimatedCurrentMileage) / kmPerDay
    const estimated = new Date()
    estimated.setDate(estimated.getDate() + Math.round(daysUntilTarget))
    return estimated
  }

  private isToday(date: Date): boolean {
    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }

  // ── Push notifications (Expo) ─────────────────────────────────────────────

  async sendPush(expoPushToken: string, title: string, body: string, data?: Record<string, unknown>) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ to: expoPushToken, title, body, data }),
      })
      if (!res.ok) {
        this.logger.warn(`Expo push failed (${res.status}) for token ${expoPushToken.slice(0, 30)}...`)
      }
    } catch (err: any) {
      this.logger.warn(`Expo push error: ${err?.message}`)
    }
  }

  // ── Mileage-based reminder triggering ────────────────────────────────────

  async notifyMileageRemindersDue(vehicleId: string, reachedMileage: number): Promise<void> {
    const reminders = await this.prisma.reminder.findMany({
      where: {
        vehicleId,
        status: 'PENDING',
        dueMileage: { lte: reachedMileage },
        notifiedDueDate: false,
        deletedAt: null,
        vehicle: { deletedAt: null },
      },
      include: { vehicle: { include: { user: true } } },
    })

    for (const reminder of reminders) {
      const user = reminder.vehicle.user
      if (!user) continue

      const lang = (user.language ?? 'en') as Lang
      const typeLabel = reminderTypeLabels[reminder.type]?.[lang] ?? reminder.type.replace(/_/g, ' ')
      const subject = copy.reminder.subjectToday(lang, typeLabel, reminder.vehicle.licensePlate)

      if (user.email && user.emailNotifications) {
        await this.mail.send(
          user.email,
          subject,
          createElement(ReminderDueEmail, {
            lang,
            userName: user.displayName ?? user.email,
            vehicleName: `${reminder.vehicle.make} ${reminder.vehicle.model} ${reminder.vehicle.year}`,
            licensePlate: reminder.vehicle.licensePlate,
            reminderType: typeLabel,
            dueDate: reminder.dueDate?.toISOString().split('T')[0] ?? '',
            dueMileage: reminder.dueMileage ?? undefined,
            stage: stageLabels[0][lang],
            note: reminder.note ?? undefined,
          }),
        )
      }

      if (user.expoPushToken) {
        await this.sendPush(
          user.expoPushToken,
          subject,
          `${reminder.vehicle.make} ${reminder.vehicle.model} · ${reminder.vehicle.licensePlate}`,
          { reminderId: reminder.id, vehicleId: reminder.vehicleId },
        )
      }

      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: { notifiedDueDate: true },
      })
    }
  }

  // ── Work order events ─────────────────────────────────────────────────────

  async sendWorkOrderCompleted(workOrderId: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        vehicle: { include: { user: true } },
        workshopOrg: true,
        technician: true,
      },
    })

    if (!wo) return
    const owner = wo.vehicle.user
    if (!owner?.email || !owner.emailNotifications) return

    const lang = (owner.language ?? 'en') as Lang
    const subject = copy.workOrderCompleted.subject(lang, wo.vehicle.make, wo.vehicle.model, wo.vehicle.licensePlate)
    await this.mail.send(
      owner.email,
      subject,
      createElement(WorkOrderCompletedEmail, {
        lang,
        userName: owner.displayName ?? owner.email,
        vehicleName: `${wo.vehicle.make} ${wo.vehicle.model} ${wo.vehicle.year}`,
        licensePlate: wo.vehicle.licensePlate,
        workshopName: wo.workshopOrg.name,
        technicianName: wo.technician?.displayName ?? undefined,
        description: wo.description,
        completedAt: wo.completedAt!.toISOString().split('T')[0],
      }),
    )
    if (owner.expoPushToken) {
      await this.sendPush(owner.expoPushToken, subject, wo.workshopOrg.name, { workOrderId: wo.id })
    }
  }

  async sendWorkOrderSigned(workOrderId: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        vehicle: { include: { user: true } },
        workshopOrg: true,
        technician: true,
      },
    })

    if (!wo) return
    const owner = wo.vehicle.user
    if (!owner?.email || !owner.emailNotifications) return

    const lang = (owner.language ?? 'en') as Lang
    const subject = copy.workOrderSigned.subject(lang, wo.vehicle.make, wo.vehicle.model, wo.vehicle.licensePlate)
    await this.mail.send(
      owner.email,
      subject,
      createElement(WorkOrderSignedEmail, {
        lang,
        userName: owner.displayName ?? owner.email,
        vehicleName: `${wo.vehicle.make} ${wo.vehicle.model} ${wo.vehicle.year}`,
        licensePlate: wo.vehicle.licensePlate,
        workshopName: wo.workshopOrg.name,
        technicianName: wo.technician?.displayName ?? undefined,
        description: wo.description,
        signedAt: wo.signedAt!.toISOString().split('T')[0],
      }),
    )
    if (owner.expoPushToken) {
      await this.sendPush(owner.expoPushToken, subject, wo.workshopOrg.name, { workOrderId: wo.id })
    }
  }
}
