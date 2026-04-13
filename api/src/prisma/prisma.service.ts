import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Models that support soft-delete via deletedAt
const SOFT_DELETE_MODELS = new Set([
  'Vehicle',
  'ServiceRecord',
  'MileageLog',
  'Expense',
  'Reminder',
  'Document',
  'WorkOrder',
  'TripLog',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    this._registerSoftDeleteMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private _registerSoftDeleteMiddleware() {
    // Intercept delete → set deletedAt instead of hard-deleting
    this.$use(async (params, next) => {
      if (!SOFT_DELETE_MODELS.has(params.model ?? '')) return next(params);

      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
        return next(params);
      }

      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args.data = { deletedAt: new Date() };
        return next(params);
      }

      // Filter out soft-deleted records from all reads unless caller opts in
      if (
        ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(params.action)
      ) {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};
        // Only inject filter if caller hasn't explicitly queried deletedAt
        if (params.args.where.deletedAt === undefined) {
          params.args.where.deletedAt = null;
        }
      }

      return next(params);
    });
  }
}
