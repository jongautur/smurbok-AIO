import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ServiceType } from '@prisma/client'

class LatestServiceDto {
  @ApiProperty() id: string
  @ApiProperty({ enum: ServiceType }) type: ServiceType
  @ApiProperty() date: Date
  @ApiProperty() mileage: number
  @ApiPropertyOptional() shop: string | null
}

class UpcomingReminderDto {
  @ApiProperty() id: string
  @ApiProperty() type: string
  @ApiPropertyOptional() dueDate: string | null
  @ApiPropertyOptional() dueMileage: number | null
  @ApiProperty() status: string
}

class VehicleCountsDto {
  @ApiProperty() serviceRecords: number
  @ApiProperty() documents: number
  @ApiProperty() expenses: number
  @ApiProperty() reminders: number
}

export class VehicleOverviewDto {
  @ApiProperty() id: string
  @ApiProperty() make: string
  @ApiProperty() model: string
  @ApiProperty() year: number
  @ApiProperty() licensePlate: string
  @ApiPropertyOptional() vin: string | null
  @ApiPropertyOptional() color: string | null
  @ApiProperty() fuelType: string

  @ApiPropertyOptional({ type: Number, description: 'Highest recorded odometer value (km)' })
  latestMileage: number | null

  @ApiPropertyOptional({ type: Number, description: 'Projected current odometer value based on historical km/day rate' })
  estimatedMileage: number | null

  @ApiPropertyOptional({ type: LatestServiceDto })
  latestService: LatestServiceDto | null

  @ApiProperty({ type: [UpcomingReminderDto] })
  upcomingReminders: UpcomingReminderDto[]

  @ApiProperty({ type: VehicleCountsDto })
  counts: VehicleCountsDto
}
