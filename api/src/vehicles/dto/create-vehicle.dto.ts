import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { FuelType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty()
  @IsString()
  @Length(1, 20)
  licensePlate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(17, 17)
  vin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ enum: FuelType })
  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;
}
