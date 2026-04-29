import { Module } from '@nestjs/common'
import { MileageLogsController } from './mileage-logs.controller'
import { MileageLogsService } from './mileage-logs.service'
import { AuthzModule } from '../authz/authz.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [AuthzModule, NotificationsModule],
  controllers: [MileageLogsController],
  providers: [MileageLogsService],
})
export class MileageLogsModule {}
