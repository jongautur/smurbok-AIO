import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, Min } from 'class-validator'
import { ExpenseCategory } from '@prisma/client'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateExpenseDto {
  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional({ description: 'Litres of fuel — only relevant for FUEL category' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  litres?: number

  @ApiPropertyOptional({ description: 'Custom label when category is OTHER' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customCategory?: string

  @ApiPropertyOptional({ description: 'Recurring interval in months' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  recurringMonths?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  costCenterId?: string
}
