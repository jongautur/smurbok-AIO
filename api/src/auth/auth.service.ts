import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DecodedIdToken } from 'firebase-admin/auth';
import type { User } from '@prisma/client';
import { Language } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called on every authenticated request.
   * Reads first — only writes on first-ever login for this Firebase UID.
   */
  async resolveAppUser(decoded: DecodedIdToken): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? '',
        displayName: decoded.name ?? null,
      },
    });
  }

  getProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      language: user.language,
    };
  }

  async updateLanguage(user: User, language: Language): Promise<User> {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { language },
    });
  }
}
