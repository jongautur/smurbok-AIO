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
const MIN_DAYS_FOR_RATE = 30

type StageFlag = 'notifiedStage1' | 'notifiedStage2' | 'notifiedStage3' | 'notifiedStage4'

const DATE_STAGES: { daysOffset: number; flag: StageFlag }[] = [
  { daysOffset: 14, flag: 'notifiedStage1' },
  { daysOffset: 7,  flag: 'notifiedStage2' },
  { daysOffset: 0,  flag: 'notifiedStage3' },
]

// kmBefore: fire when kmRemaining <= this value. Use -Infinity for overdue (already past).
const KM_STAGES: { kmBefore: number; flag: StageFlag; overdue?: true }[] = [
  { kmBefore: 1000, flag: 'notifiedStage1' },
  { kmBefore: 500,  flag: 'notifiedStage2' },
  { kmBefore: 100,  flag: 'notifiedStage3' },
  { kmBefore: 0,    flag: 'notifiedStage4', overdue: true },
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

      if (reminder.dueMileage !== null) {
        await this.checkMileageStages(reminder, user)
      } else if (reminder.dueDate !== null) {
        await this.checkDateStages(reminder, user)
      }
    }
  }

  private async checkDateStages(reminder: any, user: any) {
    for (const stage of DATE_STAGES) {
      if (reminder[stage.flag]) continue

      const triggerDate = new Date(reminder.dueDate)
      triggerDate.setDate(triggerDate.getDate() - stage.daysOffset)
      if (!this.isToday(triggerDate)) continue

      const lang = (user.language ?? 'en') as Lang
      const typeLabel = reminderTypeLabels[reminder.type]?.[lang] ?? reminder.type.replace(/_/g, ' ')
      const stageLabel = stageLabels[stage.daysOffset][lang]
      const subject = stage.daysOffset === 0
        ? copy.reminder.subjectToday(lang, typeLabel, reminder.vehicle.licensePlate)
        : copy.reminder.subjectDays(lang, stage.daysOffset, typeLabel, reminder.vehicle.licensePlate)

      await this.sendReminderNotification(user, reminder, subject, stageLabel, lang)
      await this.prisma.reminder.update({ where: { id: reminder.id }, data: { [stage.flag]: true } })
      this.logger.log(`Sent date reminder (${stageLabel}) to ${user.email} for reminder ${reminder.id}`)
    }
  }

  private async checkMileageStages(reminder: any, user: any) {
    const mileageLogs = reminder.vehicle.mileageLogs as { mileage: number; date: Date }[]
    if (mileageLogs.length === 0) return

    const estimatedMileage = this.estimateCurrentMileage(mileageLogs)
    const kmRemaining = reminder.dueMileage - estimatedMileage

    for (const stage of KM_STAGES) {
      if (reminder[stage.flag]) continue
      if (kmRemaining > stage.kmBefore) continue

      const lang = (user.language ?? 'en') as Lang
      const typeLabel = reminderTypeLabels[reminder.type]?.[lang] ?? reminder.type.replace(/_/g, ' ')

      let subject: string
      let stageLabel: string
      if (stage.overdue) {
        stageLabel = lang === 'is'
          ? `Þú ert kominn yfir skráða kílómetra fyrir ${typeLabel}`
          : `You have exceeded the recorded mileage for ${typeLabel}`
        subject = `${typeLabel} · ${lang === 'is' ? 'Gjaldfallið' : 'Overdue'} · ${reminder.vehicle.licensePlate}`
      } else {
        stageLabel = `${Math.round(kmRemaining)} km`
        subject = `${typeLabel} · ${stageLabel} · ${reminder.vehicle.licensePlate}`
      }

      await this.sendReminderNotification(user, reminder, subject, stageLabel, lang)
      await this.prisma.reminder.update({ where: { id: reminder.id }, data: { [stage.flag]: true } })
      this.logger.log(`Sent mileage reminder (${stageLabel}) to ${user.email} for reminder ${reminder.id}`)
    }
  }

  private async sendReminderNotification(user: any, reminder: any, subject: string, stageLabel: string, lang: Lang) {
    if (user.email && user.emailNotifications) {
      await this.mail.send(
        user.email,
        subject,
        createElement(ReminderDueEmail, {
          lang,
          userName: user.displayName ?? user.email,
          vehicleName: `${reminder.vehicle.make} ${reminder.vehicle.model} ${reminder.vehicle.year}`,
          licensePlate: reminder.vehicle.licensePlate,
          reminderType: reminderTypeLabels[reminder.type]?.[lang] ?? reminder.type.replace(/_/g, ' '),
          dueDate: reminder.dueDate?.toISOString().split('T')[0] ?? '',
          dueMileage: reminder.dueMileage ?? undefined,
          stage: stageLabel,
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
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private estimateCurrentMileage(mileageLogs: { mileage: number; date: Date }[]): number {
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
    return latest.mileage + daysSinceLatest * kmPerDay
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
