import { IsBoolean, IsOptional } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationDto } from '../../common/dto/pagination.dto'

export class VehicleListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Return archived vehicles instead of active ones', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  archived?: boolean
}
