import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { createHash } from 'crypto'
import type { Request, Response } from 'express'
import { Observable, map } from 'rxjs'

/**
 * Adds ETag and Last-Modified headers to GET responses.
 * Returns 304 Not Modified when the client's If-None-Match matches.
 */
@Injectable()
export class EtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp()
    const req = http.getRequest<Request>()
    const res = http.getResponse<Response>()

    if (req.method !== 'GET') return next.handle()

    return next.handle().pipe(
      map((body) => {
        if (body === null || body === undefined) return body

        const json = JSON.stringify(body)
        const etag = `"${createHash('sha1').update(json).digest('hex').slice(0, 16)}"`

        res.setHeader('ETag', etag)
        res.setHeader('Last-Modified', new Date().toUTCString())
        res.setHeader('Cache-Control', 'private, no-cache')

        const ifNoneMatch = req.headers['if-none-match']
        if (ifNoneMatch === etag) {
          res.status(304).end()
          return null
        }

        return body
      }),
    )
  }
}
