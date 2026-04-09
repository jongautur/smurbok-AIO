import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
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
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';

@Module({
  imports: [
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
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: FirebaseAuthGuard,
    },
  ],
})
export class AppModule {}
