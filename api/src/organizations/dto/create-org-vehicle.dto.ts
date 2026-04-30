import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { FuelType } from '@prisma/client'
import { IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'
import { Transform } from 'class-transformer'

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

  @ApiPropertyOptional({ description: '17-char VIN (ISO 3779) — letters I, O, Q not allowed' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'VIN must be 17 characters (A–H, J–N, P–R, S–Z, 0–9)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
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
