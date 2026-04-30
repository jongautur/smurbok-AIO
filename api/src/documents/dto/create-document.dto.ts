import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { DocumentType } from '@prisma/client'

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  type: DocumentType

  @ApiProperty({ example: 'Insurance certificate 2026' })
  @IsString()
  @MaxLength(200)
  label: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceRecordId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  expenseId?: string
}
