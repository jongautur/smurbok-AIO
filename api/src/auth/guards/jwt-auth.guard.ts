import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
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
  private readonly logger = new Logger('SECURITY');

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

    const ip = request.ip;

    // 1. httpOnly cookie — web clients
    const cookieToken = (request.cookies as Record<string, string>)?.['access_token'];
    if (cookieToken) {
      const user = await this.verifyServerJwt(cookieToken, ip);
      if (user) {
        request['user'] = user;
        return true;
      }
    }

    // 2. Authorization: Bearer — mobile clients (server JWT) or Swagger (Google OAuth)
    const bearer = this.extractBearer(request);
    if (bearer) {
      // Try our own server-issued JWT first (Expo / mobile)
      const user = await this.verifyServerJwt(bearer, ip);
      if (user) {
        request['user'] = user;
        return true;
      }

      // Fallback: Google Workspace OAuth token (Swagger UI only)
      request['user'] = await this.authService.resolveGoogleAccessToken(bearer);
      return true;
    }

    throw new UnauthorizedException();
  }

  private async verifyServerJwt(token: string, ip?: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return null;
      if (user.suspendedAt) {
        this.logger.warn(`Suspended account attempted access userId=${user.id} ip=${ip ?? '-'}`);
        throw new UnauthorizedException('account_suspended');
      }
      return user;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      return null;
    }
  }

  private extractBearer(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice(7);
  }
}
