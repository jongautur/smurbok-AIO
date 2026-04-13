import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReminderType } from '@prisma/client'
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class BulkReminderDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Vehicle IDs to target. Omit to apply to all org vehicles.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  vehicleIds?: string[]

  @ApiProperty({ enum: ReminderType })
  @IsEnum(ReminderType)
  type: ReminderType

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dueMileage?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
