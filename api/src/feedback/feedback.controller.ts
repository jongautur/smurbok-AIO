import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiConsumes, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { User } from '@prisma/client'
import { FeedbackService, type FeedbackType } from './feedback.service'

class CreateFeedbackDto {
  @IsString() @MinLength(1) @MaxLength(200)
  subject: string

  @IsString() @MinLength(1) @MaxLength(5000)
  description: string

  @IsEnum(['BUG', 'IDEA', 'OTHER'])
  type: FeedbackType
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4', 'video/quicktime']
        cb(allowed.includes(file.mimetype) ? null : new BadRequestException('Unsupported file type'), allowed.includes(file.mimetype))
      },
    }),
  )
  async submit(
    @CurrentUser() user: User,
    @Body() dto: CreateFeedbackDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.feedback.create({
      subject: dto.subject,
      description: dto.description,
      type: dto.type,
      submittedBy: user.email,
      file,
    })
  }
}
