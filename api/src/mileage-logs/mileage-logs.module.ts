import { Module } from '@nestjs/common'
import { MileageLogsController } from './mileage-logs.controller'
import { MileageLogsService } from './mileage-logs.service'

@Module({
  controllers: [MileageLogsController],
  providers: [MileageLogsService],
})
export class MileageLogsModule {}
