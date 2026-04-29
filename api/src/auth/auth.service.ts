import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import type { User } from '@prisma/client';
import { Language, Role } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as archiver from 'archiver';
import type { Response } from 'express';

const UPLOADS_ROOT = '/opt/smurbok/uploads';

const ADMIN_DOMAIN = 'smurbok.is';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService,
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

  async updateCurrency(user: User, currency: string): Promise<Partial<User>> {
    const trimmed = (currency ?? '').trim().slice(0, 10);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { currency: trimmed || 'kr' },
    });
    return this.toProfile(updated);
  }

  // ── Magic link ───────────────────────────────────────────────────────────

  async requestMagicLink(email: string, sessionId: string): Promise<void> {
    // Clean up expired tokens for this email
    await this.prisma.magicLinkToken.deleteMany({
      where: { email, expiresAt: { lt: new Date() } },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.magicLinkToken.create({
      data: { email, tokenHash, sessionId, expiresAt },
    });

    const baseUrl = process.env.PUBLIC_URL ?? 'http://localhost:3000';
    const link = `${baseUrl}/v1/auth/magic-link/verify?token=${rawToken}`;

    await this.mail.sendRaw(
      email,
      'Sign in to Smurbók',
      `<p>Tap the button below to sign in. This link expires in 15 minutes.</p>
       <p><a href="${link}" style="background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">Sign in to Smurbók</a></p>
       <p style="color:#999;font-size:13px;">If you didn't request this, ignore this email.</p>`,
    );
  }

  async verifyMagicLink(rawToken: string): Promise<{ jwt: string }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    // Upsert user
    const user = await this.prisma.user.upsert({
      where: { email: record.email },
      update: {},
      create: {
        firebaseUid: `magic_${randomBytes(8).toString('hex')}`,
        email: record.email,
        role: this.roleFromEmail(record.email),
      },
    });

    const jwt = this.jwtService.sign({ sub: user.id });

    await this.prisma.magicLinkToken.update({
      where: { tokenHash },
      data: { usedAt: new Date(), jwt },
    });

    return { jwt };
  }

  /**
   * Called from POST /auth/magic-link/exchange (web only).
   * Finds a verified magic-link session, sets the JWT as a cookie,
   * and deletes the session record so it cannot be replayed.
   */
  async exchangeMagicLinkSession(sessionId: string): Promise<{ token: string; user: Partial<User> }> {
    const record = await this.prisma.magicLinkToken.findUnique({ where: { sessionId } });

    if (!record || !record.jwt) {
      throw new UnauthorizedException('Magic link not yet verified or session not found');
    }
    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Magic link session has expired');
    }

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(record.jwt);
    } catch {
      throw new UnauthorizedException('Invalid session token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');

    // Delete the token so it cannot be exchanged again
    await this.prisma.magicLinkToken.delete({ where: { sessionId } }).catch(() => {});

    return { token: record.jwt, user: this.toProfile(user) };
  }

  async pollMagicLink(sessionId: string): Promise<{ status: 'pending' | 'verified' }> {
    const record = await this.prisma.magicLinkToken.findUnique({
      where: { sessionId },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Session expired or not found');
    }

    if (record.jwt) {
      return { status: 'verified' };
    }

    return { status: 'pending' };
  }

  // ── Push tokens ──────────────────────────────────────────────────────────

  async registerPushToken(user: User, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { expoPushToken: token },
    });
  }

  async unregisterPushToken(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { expoPushToken: null },
    });
  }

  async exportUserData(userId: string, res: Response): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId, deletedAt: null },
      include: {
        serviceRecords: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        mileageLogs:    { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        expenses:       { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        reminders:      { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        documents:      { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: this.toProfile(user),
      vehicles: vehicles.map((v) => ({
        id: v.id, make: v.make, model: v.model, year: v.year,
        licensePlate: v.licensePlate, vin: v.vin, color: v.color,
        fuelType: v.fuelType, archivedAt: v.archivedAt, createdAt: v.createdAt,
        serviceRecords: v.serviceRecords,
        mileageLogs: v.mileageLogs,
        expenses: v.expenses,
        reminders: v.reminders,
        documents: v.documents.map((d) => ({
          id: d.id, label: d.label, type: d.type,
          expiresAt: d.expiresAt, createdAt: d.createdAt,
          file: `documents/${path.basename(d.fileUrl)}`,
        })),
      })),
    };

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="smurbok-export.zip"');

    const archive = archiver.default('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    archive.append(JSON.stringify(exportData, null, 2), { name: 'data.json' });

    for (const vehicle of vehicles) {
      for (const doc of vehicle.documents) {
        if (!doc.deletedAt) {
          const fullPath = path.join('/opt/smurbok', doc.fileUrl);
          if (fs.existsSync(fullPath)) {
            const ext = path.extname(doc.fileUrl);
            archive.file(fullPath, { name: `documents/${doc.id}${ext}` });
          }
        }
      }
    }

    await archive.finalize();
  }

  async deleteAccount(userId: string): Promise<void> {
    // Delete all uploaded files for this user
    const userDir = path.join(UPLOADS_ROOT, userId);
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
    // Hard-delete the user — Prisma cascade handles all related records
    await this.prisma.user.delete({ where: { id: userId } });
  }

  private toProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      language: user.language,
      currency: user.currency,
      role: user.role,
      emailNotifications: user.emailNotifications,
      createdAt: user.createdAt,
    };
  }

  private roleFromEmail(email: string): Role {
    return email.endsWith(`@${ADMIN_DOMAIN}`) ? Role.ADMIN : Role.USER;
  }
}
