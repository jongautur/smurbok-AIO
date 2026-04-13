import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Length } from 'class-validator'

export class UpdateOrgDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 20)
  registrationNumber?: string
}
