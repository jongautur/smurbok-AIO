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
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger'
import type { User } from '@prisma/client'
import { WorkOrdersService } from './work-orders.service'
import { CreateWorkOrderDto } from './dto/create-work-order.dto'
import { UpdateWorkOrderDto } from './dto/update-work-order.dto'
import { SignWorkOrderDto } from './dto/sign-work-order.dto'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PaginationDto } from '../common/dto/pagination.dto'

@ApiTags('work-orders')
@ApiSecurity('google-workspace')
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a work order (workshop TECHNICIAN+)' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  @ApiResponse({ status: 400, description: 'Vehicle not found, or technician not a workshop member' })
  @ApiResponse({ status: 403, description: 'Not a TECHNICIAN+ in the workshop' })
  create(@CurrentUser() user: User, @Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.create(user.id, dto)
  }

  @Get()
  @ApiOperation({ summary: 'List work orders — filter by workshopOrgId (workshop view) or vehicleId (owner view)' })
  findAll(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
    @Query('workshopOrgId') workshopOrgId?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    const page = pagination.page ?? 1
    const limit = pagination.limit ?? 20
    if (workshopOrgId) return this.workOrdersService.findAllForWorkshop(user.id, workshopOrgId, page, limit)
    if (vehicleId) return this.workOrdersService.findAllForVehicle(user.id, vehicleId, page, limit)
    return { items: [], total: 0, page, limit, totalPages: 0 }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a work order (workshop member or vehicle owner)' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workOrdersService.findOne(user.id, id)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a work order (workshop TECHNICIAN+, not signed)' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a work order (workshop MANAGER+) — soft delete, not signed work orders only' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workOrdersService.cancel(user.id, id)
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a work order as completed (workshop TECHNICIAN+)' })
  @ApiResponse({ status: 400, description: 'Already completed' })
  complete(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workOrdersService.complete(user.id, id)
  }

  @Post(':id/sign')
  @ApiOperation({
    summary: 'Digitally sign a completed work order (workshop TECHNICIAN+)',
    description: 'Optionally provide `mileage` to auto-create a service record on the vehicle.',
  })
  @ApiResponse({ status: 400, description: 'Not yet completed, or already signed' })
  sign(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignWorkOrderDto,
  ) {
    return this.workOrdersService.sign(user.id, id, dto)
  }
}
