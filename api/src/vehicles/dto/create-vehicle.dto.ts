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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Icelandic plates: 2-3 letters (incl. Icelandic chars) followed by 2-3 digits, optional space/hyphen separator
const PLATE_REGEX = /^[A-ZÁÐÉÍÓÚÝÞÆÖ]{2,3}[-\s]?\d{2,3}$/i;
// VIN: 17 chars, no I/O/Q (ISO 3779)
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i;

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  make: string;

  @ApiProperty()
  @IsString()
  @Length(1, 100)
  model: string;

  @ApiProperty()
  @IsInt()
  @Min(1886)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ description: 'Icelandic format: 2–3 letters + 2–3 digits (e.g. AB123 or ABC12)', example: 'AB123' })
  @IsString()
  @Matches(PLATE_REGEX, { message: 'licensePlate must match Icelandic format: 2–3 letters followed by 2–3 digits' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : value))
  licensePlate: string;

  @ApiPropertyOptional({ description: '17-char VIN (ISO 3779) — letters I, O, Q not allowed', example: 'WBA3A5G59DNP26082' })
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
}
