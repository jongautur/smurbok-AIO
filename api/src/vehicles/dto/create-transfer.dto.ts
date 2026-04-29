import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTransferDto {
  @ApiProperty({ description: 'Email of the recipient (person or org contact)' })
  @IsEmail()
  toEmail: string

  @ApiPropertyOptional({ description: 'Target organization ID — omit for personal transfer' })
  @IsOptional()
  @IsUUID()
  toOrgId?: string
}

export class AcceptTransferDto {
  @ApiProperty({ description: 'Raw transfer token from the email link' })
  @IsString()
  token: string
}

export class DeclineTransferDto {
  @ApiProperty({ description: 'Raw transfer token from the email link' })
  @IsString()
  token: string
}
