import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { DocumentType } from '@prisma/client'

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType

  @ApiProperty({ example: 'Insurance certificate 2026' })
  @IsString()
  @MaxLength(200)
  label: string

  @ApiPropertyOptional({ example: '2027-01-01' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
