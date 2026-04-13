import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { FuelType } from '@prisma/client'
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'

export class CreateOrgVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @Length(1, 60)
  make: string

  @ApiProperty({ example: 'Land Cruiser' })
  @IsString()
  @Length(1, 60)
  model: string

  @ApiProperty({ example: 2022 })
  @IsInt()
  @Min(1900)
  @Max(2100)
  year: number

  @ApiProperty({ example: 'AB-123' })
  @IsString()
  @Length(1, 20)
  licensePlate: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(17, 17)
  vin?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string

  @ApiPropertyOptional({ enum: FuelType, default: FuelType.PETROL })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType
}
