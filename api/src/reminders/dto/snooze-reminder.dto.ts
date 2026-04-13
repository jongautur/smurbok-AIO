import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator'

export class SnoozeReminderDto {
  @ApiPropertyOptional({ description: 'Number of days to snooze from today (1–365)', example: 14 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number

  @ApiPropertyOptional({ description: 'Explicit new due date (ISO 8601)', example: '2026-05-01' })
  @IsOptional()
  @IsDateString()
  date?: string
}
