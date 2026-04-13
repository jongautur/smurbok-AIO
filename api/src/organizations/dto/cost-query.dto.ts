import { ApiPropertyOptional } from '@nestjs/swagger'
import { ExpenseCategory } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator'

export class CostQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  vehicleId?: string

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string
}
