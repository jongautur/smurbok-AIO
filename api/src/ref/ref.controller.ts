import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { RefService } from './ref.service'
import { Public } from '../auth/decorators/public.decorator'
import { Admin } from '../auth/decorators/admin.decorator'

class CreateMakeDto {
  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @Length(1, 100)
  name: string
}

class CreateModelDto {
  @ApiProperty({ example: 'Corolla' })
  @IsString()
  @Length(1, 100)
  name: string
}

@ApiTags('ref')
@ApiSecurity('google-workspace')
@Controller('ref')
export class RefController {
  constructor(private readonly refService: RefService) {}

  @Public()
  @Get('makes')
  @ApiOperation({ summary: 'List all car makes' })
  getMakes() {
    return this.refService.getMakes()
  }

  @Admin()
  @Post('makes')
  @ApiOperation({ summary: '[Admin] Add a car make' })
  createMake(@Body() dto: CreateMakeDto) {
    return this.refService.createMake(dto.name)
  }

  @Admin()
  @Delete('makes/:makeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Delete a car make and all its models' })
  deleteMake(@Param('makeId', ParseIntPipe) makeId: number) {
    return this.refService.deleteMake(makeId)
  }

  @Public()
  @Get('makes/:makeId/models')
  @ApiOperation({ summary: 'List models for a make' })
  getModels(@Param('makeId', ParseIntPipe) makeId: number) {
    return this.refService.getModels(makeId)
  }

  @Admin()
  @Post('makes/:makeId/models')
  @ApiOperation({ summary: '[Admin] Add a model to a make' })
  createModel(
    @Param('makeId', ParseIntPipe) makeId: number,
    @Body() dto: CreateModelDto,
  ) {
    return this.refService.createModel(makeId, dto.name)
  }

  @Admin()
  @Delete('models/:modelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Delete a car model' })
  deleteModel(@Param('modelId', ParseIntPipe) modelId: number) {
    return this.refService.deleteModel(modelId)
  }
}
