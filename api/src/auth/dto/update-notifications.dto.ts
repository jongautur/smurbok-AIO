import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean } from 'class-validator'

export class UpdateNotificationsDto {
  @ApiProperty({ description: 'Set to false to opt out of all email notifications' })
  @IsBoolean()
  emailNotifications: boolean
}
