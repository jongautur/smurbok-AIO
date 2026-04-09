import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator'
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
  description?: string
}
