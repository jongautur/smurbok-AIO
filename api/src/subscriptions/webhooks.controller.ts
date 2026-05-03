import { Controller, Headers, HttpCode, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { Public } from '../auth/decorators/public.decorator'
import { SubscriptionsService } from './subscriptions.service'

@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Public()
  @Post('kling')
  @HttpCode(HttpStatus.OK)
  async klingWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-kling-signature') signature: string,
  ) {
    const rawBody = req.rawBody
    if (!rawBody) throw new UnauthorizedException('Missing raw body')
    await this.subscriptions.handleWebhook(rawBody, signature ?? '')
    return { received: true }
  }
}
