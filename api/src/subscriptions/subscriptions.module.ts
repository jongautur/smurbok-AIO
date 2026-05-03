import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { KlingService } from './kling.service'
import { SubscriptionsService } from './subscriptions.service'
import { SubscriptionsController } from './subscriptions.controller'
import { WebhooksController } from './webhooks.controller'

@Module({
  imports: [PrismaModule],
  providers: [KlingService, SubscriptionsService],
  controllers: [SubscriptionsController, WebhooksController],
})
export class SubscriptionsModule {}
