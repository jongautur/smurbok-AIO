import { IsEmail, IsEnum } from 'class-validator'
import { OrgRole } from '@prisma/client'
import { ApiProperty } from '@nestjs/swagger'

export class CreateInviteDto {
  @ApiProperty({ example: 'driver@example.com' })
  @IsEmail()
  email: string

  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role: OrgRole
}
