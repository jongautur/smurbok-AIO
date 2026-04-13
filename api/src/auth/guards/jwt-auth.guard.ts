import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    // Primary: server-issued JWT from httpOnly cookie
    const cookieToken = (request.cookies as Record<string, string>)?.['access_token'];
    if (cookieToken) {
      try {
        const payload = this.jwtService.verify<{ sub: string }>(cookieToken);
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (user) {
          request['user'] = user;
          return true;
        }
      } catch {
        // expired or tampered — fall through
      }
    }

    // Fallback: Google Workspace Bearer token (Swagger UI only)
    const bearer = this.extractBearer(request);
    if (bearer) {
      request['user'] = await this.authService.resolveGoogleAccessToken(bearer);
      return true;
    }

    throw new UnauthorizedException();
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice(7);
  }
}
