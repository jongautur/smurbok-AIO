import { Module } from '@nestjs/common'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'
import { StorageModule } from '../storage/storage.module'
import { AuthzModule } from '../authz/authz.module'

@Module({
  imports: [StorageModule, AuthzModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
