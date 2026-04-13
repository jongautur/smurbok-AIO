import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateTripLogDto {
  @ApiProperty({ example: 87500 })
  @IsInt()
  @Min(0)
  startMileage: number

  @ApiProperty({ example: '2026-04-11' })
  @IsDateString()
  date: string

  @ApiPropertyOptional({ example: 'Delivery run to Akureyri' })
  @IsOptional()
  @IsString()
  purpose?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
