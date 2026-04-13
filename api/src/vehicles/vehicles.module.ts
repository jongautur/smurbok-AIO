import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { StorageModule } from '../storage/storage.module';
import { AuthzModule } from '../authz/authz.module';

@Module({
  imports: [StorageModule, AuthzModule],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
