import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ApiSecurity, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsInt, Min, Max } from 'class-validator'
import type { User } from '@prisma/client'
import { SubscriptionsService } from './subscriptions.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

class CreateCheckoutDto {
  @IsInt() @Min(1) @Max(2)
  tier!: 1 | 2
}

@ApiTags('subscriptions')
@ApiSecurity('google-workspace')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Create a Kling checkout session for a tier upgrade' })
  createCheckout(@CurrentUser() user: User, @Body() dto: CreateCheckoutDto) {
    return this.subscriptions.createCheckout(user, dto.tier)
  }

  @Post('cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel current subscription (at period end)' })
  cancelSubscription(@CurrentUser() user: User) {
    return this.subscriptions.cancelSubscription(user)
  }

  @Get('portal')
  @ApiOperation({ summary: 'Get Kling billing portal URL' })
  getBillingPortal(@CurrentUser() user: User) {
    return this.subscriptions.getBillingPortalUrl(user)
  }

  @Get('confirm')
  @ApiOperation({ summary: 'Confirm checkout session and apply tier (no-webhook fallback)' })
  confirmCheckout(@CurrentUser() user: User, @Query('sessionId') sessionId: string) {
    return this.subscriptions.confirmCheckout(user.id, sessionId)
  }

  @Get('cancel-preview')
  @ApiOperation({ summary: 'Preview data that exceeds free tier limits' })
  getCancelPreview(@CurrentUser() user: User) {
    return this.subscriptions.getCancelPreview(user.id)
  }

  @Get('cancel-zip')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Download selected excess documents as ZIP' })
  async getCancelZip(
    @CurrentUser() user: User,
    @Query('ids') ids: string,
    @Res() res: Response,
  ) {
    const docIds = ids ? ids.split(',').filter(Boolean) : []
    await this.subscriptions.streamCancelZip(user.id, docIds, res)
  }
}
