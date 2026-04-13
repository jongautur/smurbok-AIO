import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export class UpdateTripLogDto {
  @ApiPropertyOptional({ description: 'Set to close the trip', example: 87850 })
  @IsOptional()
  @IsInt()
  @Min(0)
  endMileage?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string
}
