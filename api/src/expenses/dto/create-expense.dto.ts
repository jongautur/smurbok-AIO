import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, Min } from 'class-validator'
import { ExpenseCategory } from '@prisma/client'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number

  @ApiProperty()
  @IsDateString()
  date: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @ApiPropertyOptional({ description: 'Current odometer reading — auto-creates a mileage log if higher than the latest recorded value' })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number

  @ApiPropertyOptional({ description: 'Litres of fuel — only relevant for FUEL category; used for fuel efficiency calculations' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  litres?: number

  @ApiPropertyOptional({ description: 'Custom label when category is OTHER' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customCategory?: string

  @ApiPropertyOptional({ description: 'Recurring interval in months — expense repeats on this schedule' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  recurringMonths?: number

  @ApiPropertyOptional({ description: 'Cost center ID — only relevant for org vehicles; used for departmental cost reporting' })
  @IsOptional()
  @IsUUID()
  costCenterId?: string

  @ApiPropertyOptional({ type: [String], description: 'Existing document IDs to link to this expense' })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  documentIds?: string[]
}
