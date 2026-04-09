import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator'
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
  description?: string
}
