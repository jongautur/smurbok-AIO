import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsOptional } from 'class-validator'
import { OrgRole } from '@prisma/client'

export class AddMemberDto {
  @ApiProperty({ example: 'driver@company.is' })
  @IsEmail()
  email: string

  @ApiPropertyOptional({ enum: OrgRole, default: OrgRole.DRIVER })
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role: OrgRole
}
