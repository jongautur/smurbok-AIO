import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator'
import { ServiceType } from '@prisma/client'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class SignWorkOrderDto {
  @ApiPropertyOptional({
    description: 'Current odometer reading — if provided, creates a service record on the vehicle',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number

  @ApiPropertyOptional({ enum: ServiceType, default: 'OTHER' })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType

  @ApiPropertyOptional({ description: 'Cost in ISK' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number
}
