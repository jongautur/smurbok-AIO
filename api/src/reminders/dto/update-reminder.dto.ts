import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { ReminderStatus, ReminderType } from '@prisma/client'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateReminderDto {
  @ApiPropertyOptional({ enum: ReminderType })
  @IsOptional()
  @IsEnum(ReminderType)
  type?: ReminderType

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  dueMileage?: number

  @ApiPropertyOptional({ enum: ReminderStatus })
  @IsOptional()
  @IsEnum(ReminderStatus)
  status?: ReminderStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
