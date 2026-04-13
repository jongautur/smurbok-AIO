import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString, Length } from 'class-validator'
import { OrgType } from '@prisma/client'

export class CreateOrgDto {
  @ApiProperty({ example: 'Strætó bs' })
  @IsString()
  @Length(1, 120)
  name: string

  @ApiProperty({ enum: OrgType })
  @IsEnum(OrgType)
  type: OrgType

  @ApiPropertyOptional({ example: '5306882059' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  registrationNumber?: string

  @ApiPropertyOptional({ example: 'IS', default: 'IS' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string
}
