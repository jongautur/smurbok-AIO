import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { ReminderType } from '@prisma/client'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateReminderDto {
  @ApiProperty({ enum: ReminderType })
  @IsEnum(ReminderType)
  type: ReminderType

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dueMileage?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
