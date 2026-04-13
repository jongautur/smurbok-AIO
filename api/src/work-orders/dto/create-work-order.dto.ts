import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'Workshop organization ID' })
  @IsUUID()
  workshopOrgId: string

  @ApiProperty({ description: 'Vehicle ID — use GET /vehicles/lookup to find by plate/VIN' })
  @IsUUID()
  vehicleId: string

  @ApiProperty({ example: 'Oil change, brake pad replacement, full inspection' })
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiPropertyOptional({ description: 'Assign a technician (must be a workshop member)' })
  @IsOptional()
  @IsUUID()
  technicianId?: string
}
