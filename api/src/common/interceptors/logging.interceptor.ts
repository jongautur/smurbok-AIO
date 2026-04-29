import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

const SECURITY_STATUSES = new Set([401, 403, 429]);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly secLogger = new Logger('SECURITY');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const { method } = req;
    // Strip sensitive query params from logged URLs to prevent token leakage in logs
    const url = req.url.replace(/([?&]token=)[^&]*/g, '$1[REDACTED]')
    const correlationId = (req as any).correlationId ?? '-';
    const ip = req.ip ?? '-';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(
            `${method} ${url} ${res.statusCode} +${ms}ms [${correlationId}]`,
          );
        },
        error: (err: any) => {
          const ms = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.warn(
            `${method} ${url} ${status} +${ms}ms [${correlationId}] ${err?.message ?? ''}`,
          );
          if (SECURITY_STATUSES.has(status)) {
            this.secLogger.warn(
              `${status} ${method} ${url} ip=${ip} cid=${correlationId} reason=${err?.message ?? 'unknown'}`,
            );
          }
        },
      }),
    );
  }
}
