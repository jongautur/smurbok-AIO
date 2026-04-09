import { Module } from '@nestjs/common'
import { RefController } from './ref.controller'
import { RefService } from './ref.service'

@Module({
  controllers: [RefController],
  providers: [RefService],
})
export class RefModule {}
