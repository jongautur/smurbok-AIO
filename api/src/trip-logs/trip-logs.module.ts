import { Module } from '@nestjs/common'
import { TripLogsController } from './trip-logs.controller'
import { TripLogsService } from './trip-logs.service'

@Module({
  controllers: [TripLogsController],
  providers: [TripLogsService],
})
export class TripLogsModule {}
