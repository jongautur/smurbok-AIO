import { Module } from '@nestjs/common'
import { RemindersController } from './reminders.controller'
import { RemindersService } from './reminders.service'
import { AuthzModule } from '../authz/authz.module'

@Module({
  imports: [AuthzModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
