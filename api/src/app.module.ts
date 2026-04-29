import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { RolesGuard } from './auth/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ServiceRecordsModule } from './service-records/service-records.module'
import { ExpensesModule } from './expenses/expenses.module';
import { RemindersModule } from './reminders/reminders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MileageLogsModule } from './mileage-logs/mileage-logs.module';
import { RefModule } from './ref/ref.module';
import { UsersModule } from './users/users.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuditLogModule } from './audit-log/audit-log.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { TripLogsModule } from './trip-logs/trip-logs.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { PurgeModule } from './purge/purge.module';
import { FeedbackModule } from './feedback/feedback.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 600 }, // 600 req/min globally
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    FirebaseModule,
    AuthModule,
    HealthModule,
    VehiclesModule,
    ServiceRecordsModule,
    ExpensesModule,
    RemindersModule,
    MileageLogsModule,
    RefModule,
    DocumentsModule,
    StorageModule,
    DashboardModule,
    UsersModule,
    AuditLogModule,
    OrganizationsModule,
    TripLogsModule,
    WorkOrdersModule,
    NotificationsModule,
    PurgeModule,
    FeedbackModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
