import { Injectable, ExecutionContext } from '@nestjs/common'
import { ThrottlerGuard, ThrottlerLimitDetail, ThrottlerException } from '@nestjs/throttler'
import { Request, Response } from 'express'
import type { User } from '@prisma/client'

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  /**
   * Use the authenticated user's ID as the throttle key when available.
   * Falls back to IP for unauthenticated endpoints (e.g. /auth/login).
   */
  protected async getTracker(req: Request): Promise<string> {
    const user = req['user'] as User | undefined
    return user?.id ?? req.ip ?? 'unknown'
  }

  /**
   * Add a Retry-After header and a human-readable message before throwing.
   * The frontend can read Retry-After to show a countdown or back off automatically.
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const res = context.switchToHttp().getResponse<Response>()
    const retryAfterSeconds = Math.ceil(detail.timeToExpire / 1000)
    res.setHeader('Retry-After', retryAfterSeconds)
    throw new ThrottlerException(
      `Too many requests — please wait ${retryAfterSeconds} seconds before retrying`,
    )
  }
}
