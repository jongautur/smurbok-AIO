import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Response } from 'express'

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const status = exception.getStatus()
    const body = exception.getResponse()

    // class-validator errors land as an array in body.message
    const message =
      typeof body === 'string'
        ? body
        : Array.isArray((body as any).message)
          ? (body as any).message
          : ((body as any).message ?? 'An error occurred')

    const error =
      typeof body === 'object'
        ? ((body as any).error ?? (HttpStatus as any)[status])
        : (HttpStatus as any)[status]

    res.status(status).json({ statusCode: status, error, message })
  }
}
