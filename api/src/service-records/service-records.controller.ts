import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { ServiceRecordsService } from './service-records.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('service-records')
@ApiBearerAuth()
@Controller()
export class ServiceRecordsController {
  constructor(private readonly serviceRecordsService: ServiceRecordsService) {}

  // Nested under vehicle — list + create
  @Get('vehicles/:vehicleId/service-records')
  findAll(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.serviceRecordsService.findAllForVehicle(vehicleId, user.id);
  }

  @Post('vehicles/:vehicleId/service-records')
  create(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateServiceRecordDto,
  ) {
    return this.serviceRecordsService.create(vehicleId, user.id, dto);
  }

  // Top-level by record ID — update + delete
  @Patch('service-records/:id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceRecordDto,
  ) {
    return this.serviceRecordsService.update(id, user.id, dto);
  }

  @Delete('service-records/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.serviceRecordsService.remove(id, user.id);
  }
}
