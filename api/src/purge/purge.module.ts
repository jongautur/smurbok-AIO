import { Module } from '@nestjs/common';
import { PurgeService } from './purge.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PurgeService],
})
export class PurgeModule {}
