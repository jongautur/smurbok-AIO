import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FuelType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PLATE_REGEX = /^[A-ZÁÐÉÍÓÚÝÞÆÖ]{2,3}[-\s]?\d{2,3}$/i;
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

export class UpdateVehicleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  make?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1886)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @ApiPropertyOptional({ description: 'Icelandic format: 2–3 letters + 2–3 digits', example: 'AB123' })
  @IsOptional()
  @IsString()
  @Matches(PLATE_REGEX, { message: 'licensePlate must match Icelandic format: 2–3 letters followed by 2–3 digits' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : value))
  licensePlate?: string;

  @ApiPropertyOptional({ description: '17-char VIN (ISO 3779)', example: 'WBA3A5G59DNP26082' })
  @IsOptional()
  @IsString()
  @Matches(VIN_REGEX, { message: 'VIN must be 17 characters (A–H, J–N, P–R, S–Z, 0–9)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  vin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @ApiPropertyOptional({ description: 'Date the vehicle was acquired (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  acquiredAt?: string;

  @ApiPropertyOptional({ description: 'Date the vehicle was disposed of — sets disposedAt and archives the vehicle (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  disposedAt?: string;
}
