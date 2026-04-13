import { Module } from '@nestjs/common'
import { ExpensesController } from './expenses.controller'
import { ExpensesService } from './expenses.service'
import { AuthzModule } from '../authz/authz.module'

@Module({
  imports: [AuthzModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
