import { Injectable, PayloadTooLargeException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as fs from 'fs'
import * as path from 'path'

const UPLOADS_ROOT = '/opt/smurbok/uploads'

// Limits — override via environment variables
const FILE_LIMIT_BYTES = parseInt(process.env.STORAGE_FILE_LIMIT_MB ?? '500') * 1024 * 1024
const DOCUMENTS_LIMIT = parseInt(process.env.STORAGE_DOCUMENTS_LIMIT ?? '200')
const VEHICLES_LIMIT = parseInt(process.env.STORAGE_VEHICLES_LIMIT ?? '20')

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsage(userId: string) {
    const [documentsCount, vehiclesCount, fileBytes] = await Promise.all([
      this.prisma.document.count({
        where: { vehicle: { userId } },
      }),
      this.prisma.vehicle.count({
        where: { userId },
      }),
      Promise.resolve(this.getUserFileSizeBytes(userId)),
    ])

    return {
      files: {
        usedBytes: fileBytes,
        usedMB: Math.round((fileBytes / 1024 / 1024) * 100) / 100,
        limitMB: FILE_LIMIT_BYTES / 1024 / 1024,
        percent: Math.round((fileBytes / FILE_LIMIT_BYTES) * 10000) / 100,
      },
      documents: {
        count: documentsCount,
        limit: DOCUMENTS_LIMIT,
      },
      vehicles: {
        count: vehiclesCount,
        limit: VEHICLES_LIMIT,
      },
    }
  }

  /** Throws if adding incomingBytes would exceed the user's file storage limit. */
  async enforceFileLimit(userId: string, incomingBytes: number): Promise<void> {
    const used = this.getUserFileSizeBytes(userId)
    if (used + incomingBytes > FILE_LIMIT_BYTES) {
      const limitMB = FILE_LIMIT_BYTES / 1024 / 1024
      throw new PayloadTooLargeException(
        `Storage limit reached. You have used ${Math.round(used / 1024 / 1024)}MB of your ${limitMB}MB allowance.`,
      )
    }
  }

  /** Throws if the user already has the maximum number of documents. */
  async enforceDocumentLimit(userId: string): Promise<void> {
    const count = await this.prisma.document.count({
      where: { vehicle: { userId } },
    })
    if (count >= DOCUMENTS_LIMIT) {
      throw new PayloadTooLargeException(
        `Document limit reached. Maximum ${DOCUMENTS_LIMIT} documents per account.`,
      )
    }
  }

  /** Throws if the user already has the maximum number of vehicles. */
  async enforceVehicleLimit(userId: string): Promise<void> {
    const count = await this.prisma.vehicle.count({ where: { userId } })
    if (count >= VEHICLES_LIMIT) {
      throw new PayloadTooLargeException(
        `Vehicle limit reached. Maximum ${VEHICLES_LIMIT} vehicles per account.`,
      )
    }
  }

  async getAllUsersUsage() {
    const users = await this.prisma.user.findMany({
      select: { id: true, email: true, displayName: true },
    })

    const perUser = await Promise.all(
      users.map(async (u) => ({ user: u, usage: await this.getUsage(u.id) })),
    )

    const totalBytes = perUser.reduce((sum, { usage }) => sum + usage.files.usedBytes, 0)

    return {
      totalFiles: {
        usedBytes: totalBytes,
        usedMB: Math.round((totalBytes / 1024 / 1024) * 100) / 100,
      },
      users: perUser,
    }
  }

  // ── private ──────────────────────────────────────────────────────────────────

  private getUserFileSizeBytes(userId: string): number {
    const userDir = path.join(UPLOADS_ROOT, userId)
    if (!fs.existsSync(userDir)) return 0
    return this.getDirSizeBytes(userDir)
  }

  private getDirSizeBytes(dir: string): number {
    let total = 0
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        total += this.getDirSizeBytes(fullPath)
      } else if (entry.isFile()) {
        total += fs.statSync(fullPath).size
      }
    }
    return total
  }
}
