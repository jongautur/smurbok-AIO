import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const RETENTION_DAYS = 7;
const MAGIC_LINK_MAX_AGE_DAYS = 1;

@Injectable()
export class PurgeService {
  private readonly logger = new Logger(PurgeService.name);
  private readonly rawPrisma: PrismaClient;

  constructor(private readonly prisma: PrismaService) {
    this.rawPrisma = new PrismaClient();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const magicLinkCutoff = new Date(Date.now() - MAGIC_LINK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

    const results = await Promise.allSettled([
      this.rawPrisma.tripLog.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.rawPrisma.document.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.rawPrisma.reminder.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.rawPrisma.expense.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.rawPrisma.mileageLog.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.rawPrisma.serviceRecord.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      this.rawPrisma.workOrder.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      // Vehicles last — sub-resources already purged above, cascade handles any remaining
      this.rawPrisma.vehicle.deleteMany({ where: { deletedAt: { lt: cutoff } } }),
      // Magic links expire after 15 minutes but we hard-delete rows older than 1 day
      this.rawPrisma.magicLinkToken.deleteMany({ where: { createdAt: { lt: magicLinkCutoff } } }),
    ]);

    const counts = results.map((r) => (r.status === 'fulfilled' ? r.value.count : 0));
    const names = ['tripLogs', 'documents', 'reminders', 'expenses', 'mileageLogs', 'serviceRecords', 'workOrders', 'vehicles', 'magicLinkTokens'];
    const summary = names.map((n, i) => `${n}=${counts[i]}`).join(', ');
    this.logger.log(`Purge complete (cutoff=${cutoff.toISOString()}): ${summary}`);
  }
}
