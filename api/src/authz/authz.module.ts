import { Module } from '@nestjs/common'
import { VehicleAuthzService } from './vehicle-authz.service'

@Module({
  providers: [VehicleAuthzService],
  exports: [VehicleAuthzService],
})
export class AuthzModule {}
