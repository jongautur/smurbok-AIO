import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, AuditResource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(userId: string, action: AuditAction, resource: AuditResource, resourceId: string): void {
    this.prisma.auditLog
      .create({ data: { userId, action, resource, resourceId } })
      .catch((err) => this.logger.error('Audit log write failed', err));
  }
}
