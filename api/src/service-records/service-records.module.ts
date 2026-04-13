import { Module } from '@nestjs/common';
import { ServiceRecordsController } from './service-records.controller';
import { ServiceRecordsService } from './service-records.service';
import { AuthzModule } from '../authz/authz.module';

@Module({
  imports: [AuthzModule],
  controllers: [ServiceRecordsController],
  providers: [ServiceRecordsService],
})
export class ServiceRecordsModule {}
