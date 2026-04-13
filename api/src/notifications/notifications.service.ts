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

type NotificationStage = '14_days' | '7_days' | 'due_date'

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
        vehicle: { userId: { not: null } },
      },
      include: {
        vehicle: {
          include: {
            user: true,
            mileageLogs: { orderBy: { date: 'asc' } },
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
   * Uses actual km/day from mileage log history if >= 30 days of data exists,
   * otherwise falls back to 15,000 km/year.
   */
  private estimateDateForMileage(
    targetMileage: number,
    mileageLogs: { mileage: number; date: Date }[],
  ): Date | null {
    const sorted = [...mileageLogs].sort((a, b) => a.date.getTime() - b.date.getTime())
    const latest = sorted[sorted.length - 1]

    if (latest.mileage >= targetMileage) return null // already past it

    let kmPerDay = DEFAULT_KM_PER_DAY

    if (sorted.length >= 2) {
      const oldest = sorted[0]
      const daysDiff = (latest.date.getTime() - oldest.date.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff >= MIN_DAYS_FOR_RATE) {
        const calculated = (latest.mileage - oldest.mileage) / daysDiff
        if (calculated > 0) kmPerDay = calculated
      }
    }

    const daysUntilTarget = (targetMileage - latest.mileage) / kmPerDay
    const estimated = new Date(latest.date)
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
    await this.mail.send(
      owner.email,
      copy.workOrderCompleted.subject(lang, wo.vehicle.make, wo.vehicle.model, wo.vehicle.licensePlate),
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
    await this.mail.send(
      owner.email,
      copy.workOrderSigned.subject(lang, wo.vehicle.make, wo.vehicle.model, wo.vehicle.licensePlate),
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
  }
}
