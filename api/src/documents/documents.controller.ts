import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import * as path from 'path'
import { PaginationDto } from '../common/dto/pagination.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { ApiSecurity, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { memoryStorage } from 'multer'
import type { Response } from 'express'
import type { User } from '@prisma/client'
import { DocumentsService } from './documents.service'
import { CreateDocumentDto } from './dto/create-document.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

// Explicit allowlist — never trust a user-supplied Content-Type
const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.pdf':  'application/pdf',
}

@ApiTags('documents')
@ApiSecurity('google-workspace')
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('vehicles/:vehicleId/documents')
  findAll(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.documentsService.findAllForVehicle(vehicleId, user.id, pagination.page ?? 1, pagination.limit ?? 20)
  }

  @Post('vehicles/:vehicleId/documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true)
        } else {
          cb(new Error('Invalid file type'), false)
        }
      },
    }),
  )
  create(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.create(vehicleId, user.id, dto, file)
  }

  /** Authenticated: issue a short-lived signed URL for a document. */
  @Get('documents/:id/link')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getFileLink(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const token = await this.documentsService.issueFileToken(id, user.id)
    return { token }
  }

  /** Public: serve a file using a signed token (?token=...). */
  @Public()
  @Get('documents/file')
  async serveFile(
    @Query('token') token: string,
    @Query('download') download: string,
    @Res() res: Response,
  ) {
    const { filePath, filename } = await this.documentsService.getFilePathFromToken(token)

    const ext = path.extname(filePath).toLowerCase()
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'
    const disposition = download === '1' ? 'attachment' : 'inline'

    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`)
    res.sendFile(filePath)
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.remove(id, user.id)
  }
}
