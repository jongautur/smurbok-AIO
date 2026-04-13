import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import type { User } from '@prisma/client';
import { Language, Role } from '@prisma/client';

const ADMIN_DOMAIN = 'smurbok.is';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(FIREBASE_APP) private readonly firebaseApp: admin.app.App,
  ) {}

  /**
   * Called from POST /auth/login.
   * Verifies the Firebase ID token once, upserts the user, and returns a
   * server-issued JWT along with the user profile.
   */
  async loginWithFirebase(firebaseToken: string): Promise<{ token: string; user: Partial<User> }> {
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await this.firebaseApp.auth().verifyIdToken(firebaseToken);
    } catch {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    const user = await this.resolveAppUser(decoded);
    const token = this.jwtService.sign({ sub: user.id });
    return { token, user: this.toProfile(user) };
  }

  /**
   * Upserts the User row for a verified Firebase identity.
   * Auto-assigns ADMIN role to @smurbok.is emails.
   */
  async resolveAppUser(decoded: admin.auth.DecodedIdToken): Promise<User> {
    const role = this.roleFromEmail(decoded.email ?? '');

    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (existing) {
      if (role === Role.ADMIN && existing.role !== Role.ADMIN) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { role: Role.ADMIN },
        });
      }
      return existing;
    }

    return this.prisma.user.create({
      data: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        displayName: decoded.name ?? null,
        role,
      },
    });
  }

  /**
   * Validates a Google OAuth access token (used by Swagger UI).
   * Enforces that the account belongs to the @smurbok.is Workspace domain.
   */
  async resolveGoogleAccessToken(accessToken: string): Promise<User> {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) throw new UnauthorizedException('Invalid Google token');

    const info = await res.json() as {
      error?: string;
      email?: string;
      name?: string;
      sub?: string;
      hd?: string;
      aud?: string;
    };

    if (info.error || !info.email) throw new UnauthorizedException('Invalid Google token');

    const emailDomain = info.email.split('@')[1];
    if (info.hd !== ADMIN_DOMAIN && emailDomain !== ADMIN_DOMAIN) {
      throw new ForbiddenException(`Only @${ADMIN_DOMAIN} accounts can use this access method`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && info.aud !== clientId) {
      throw new UnauthorizedException('Token audience mismatch');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: info.email } });
    if (existing) {
      if (existing.role !== Role.ADMIN) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { role: Role.ADMIN },
        });
      }
      return existing;
    }

    return this.prisma.user.create({
      data: {
        firebaseUid: `google_ws_${info.sub}`,
        email: info.email,
        displayName: info.name ?? null,
        role: Role.ADMIN,
      },
    });
  }

  getProfile(user: User) {
    return this.toProfile(user);
  }

  async updateLanguage(user: User, language: Language): Promise<User> {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { language },
    });
  }

  async updateNotifications(user: User, emailNotifications: boolean): Promise<Partial<User>> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailNotifications },
    });
    return this.toProfile(updated);
  }

  private toProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      language: user.language,
      role: user.role,
      emailNotifications: user.emailNotifications,
    };
  }

  private roleFromEmail(email: string): Role {
    return email.endsWith(`@${ADMIN_DOMAIN}`) ? Role.ADMIN : Role.USER;
  }
}
