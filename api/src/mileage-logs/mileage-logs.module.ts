import { Module } from '@nestjs/common'
import { MileageLogsController } from './mileage-logs.controller'
import { MileageLogsService } from './mileage-logs.service'
import { AuthzModule } from '../authz/authz.module'

@Module({
  imports: [AuthzModule],
  controllers: [MileageLogsController],
  providers: [MileageLogsService],
})
export class MileageLogsModule {}
