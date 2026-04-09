import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { RefService } from './ref.service'
import { Public } from '../auth/decorators/public.decorator'

@ApiTags('ref')
@Controller('ref')
export class RefController {
  constructor(private readonly refService: RefService) {}

  @Public()
  @Get('makes')
  getMakes() {
    return this.refService.getMakes()
  }

  @Public()
  @Get('makes/:makeId/models')
  getModels(@Param('makeId', ParseIntPipe) makeId: number) {
    return this.refService.getModels(makeId)
  }
}
