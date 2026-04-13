import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { MailModule } from '../mail/mail.module'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
