import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateMileageLogDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  mileage: number

  @ApiProperty()
  @IsDateString()
  date: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
