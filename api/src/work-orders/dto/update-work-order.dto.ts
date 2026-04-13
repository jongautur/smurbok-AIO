import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ example: 'Oil change completed, brake pads ordered — awaiting parts' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'Reassign technician (must be a workshop member)' })
  @IsOptional()
  @IsUUID()
  technicianId?: string
}
