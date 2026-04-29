import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { VehicleAuthzService } from '../authz/vehicle-authz.service'
import { CreateDocumentDto } from './dto/create-document.dto'
import { paginate, type Paginated } from '../common/dto/pagination.dto'
import * as fs from 'fs'
import * as path from 'path'
import * as jwt from 'jsonwebtoken'
import { execFile } from 'child_process'
import { promisify } from 'util'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

const execFileAsync = promisify(execFile)

const UPLOADS_ROOT = '/opt/smurbok/uploads'
const TOKEN_TTL_SECONDS = 3600 // 1 hour
const IMAGE_MAX_PX = 2000      // resize if either dimension exceeds this
const IMAGE_QUALITY = 82       // WebP quality (0-100)

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])

function signingSecret(): string {
  const s = process.env.FILE_SIGNING_SECRET
  if (!s) throw new Error('FILE_SIGNING_SECRET is not set')
  return s
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly vehicleAuthz: VehicleAuthzService,
  ) {}

  async findAllForVehicle(vehicleId: string, userId: string, page: number, limit: number): Promise<Paginated<object>> {
    await this.vehicleAuthz.requireView(vehicleId, userId)
    const skip = (page - 1) * limit
    const where = { vehicleId }
    const select = { id: true, vehicleId: true, type: true, label: true, fileUrl: true, fileSizeBytes: true, expiresAt: true, createdAt: true }
    const [docs, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, select }),
      this.prisma.document.count({ where }),
    ])
    return paginate(docs, total, page, limit)
  }

  async create(
    vehicleId: string,
    userId: string,
    dto: CreateDocumentDto,
    file: Express.Multer.File,
  ) {
    await this.vehicleAuthz.requireEdit(vehicleId, userId)

    // Enforce storage limits before doing any work
    await Promise.all([
      this.storageService.enforceFileLimit(userId, file.buffer.length),
      this.storageService.enforceDocumentLimit(userId),
    ])

    // Validate via magic bytes — not the browser-supplied MIME type
    const { fileTypeFromBuffer } = await import('file-type')
    const detected = await fileTypeFromBuffer(file.buffer)
    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      throw new BadRequestException('Invalid file type')
    }

    const dir = path.join(UPLOADS_ROOT, userId, vehicleId)
    fs.mkdirSync(dir, { recursive: true, mode: 0o750 })

    let finalBuffer: Buffer
    let ext: string

    if (detected.mime === 'application/pdf') {
      finalBuffer = await this.optimizePdf(file.buffer, dir)
      ext = '.pdf'
    } else {
      // All images → WebP. limitInputPixels prevents decompression bomb attacks
      // where a tiny compressed file expands to gigabytes in memory.
      finalBuffer = await sharp(file.buffer, { limitInputPixels: IMAGE_MAX_PX * IMAGE_MAX_PX })
        .resize(IMAGE_MAX_PX, IMAGE_MAX_PX, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: IMAGE_QUALITY })
        .toBuffer()
      ext = '.webp'
    }

    const filename = `${uuidv4()}${ext}`
    const fullPath = path.join(dir, filename)
    fs.writeFileSync(fullPath, finalBuffer, { mode: 0o640 })

    this.logger.log(
      `Saved ${file.originalname} → ${filename} ` +
      `(${Math.round(file.buffer.length / 1024)}KB → ${Math.round(finalBuffer.length / 1024)}KB)`,
    )

    const fileUrl = `uploads/${userId}/${vehicleId}/${filename}`

    return this.prisma.document.create({
      data: {
        vehicleId,
        type: dto.type,
        label: dto.label,
        fileUrl,
        fileSizeBytes: finalBuffer.length,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      select: {
        id: true,
        vehicleId: true,
        type: true,
        label: true,
        fileUrl: true,
        fileSizeBytes: true,
        expiresAt: true,
        createdAt: true,
      },
    })
  }

  /** Issue a signed token granting access to a single document for 1 hour. */
  async issueFileToken(id: string, userId: string): Promise<string> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { vehicle: true },
    })
    if (!doc) throw new NotFoundException('Document not found')
    await this.vehicleAuthz.assertView(doc.vehicle, userId)

    return jwt.sign({ docId: id, userId }, signingSecret(), { expiresIn: TOKEN_TTL_SECONDS })
  }

  /** Verify a signed token and return the file path + download filename. */
  async getFilePathFromToken(token: string): Promise<{ filePath: string; filename: string }> {
    let payload: { docId: string; userId: string }
    try {
      payload = jwt.verify(token, signingSecret()) as { docId: string; userId: string }
    } catch {
      throw new UnauthorizedException('Invalid or expired file token')
    }

    const doc = await this.prisma.document.findUnique({
      where: { id: payload.docId },
      select: { fileUrl: true, label: true, vehicle: true },
    })
    if (!doc) throw new NotFoundException('Document not found')
    // The token already binds userId — verify it still has access (membership may have changed)
    await this.vehicleAuthz.assertView(doc.vehicle, payload.userId)

    const fullPath = path.join('/opt/smurbok', doc.fileUrl)
    if (!fs.existsSync(fullPath)) throw new NotFoundException('File not found')

    const ext = path.extname(doc.fileUrl)           // e.g. .webp
    const filename = `${doc.label}${ext}`            // e.g. "Insurance 2026.webp"
    return { filePath: fullPath, filename }
  }

  async remove(id: string, userId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { vehicle: true },
    })
    if (!doc) throw new NotFoundException('Document not found')
    await this.vehicleAuthz.assertEdit(doc.vehicle, userId)

    const fullPath = path.join('/opt/smurbok', doc.fileUrl)
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)

    await this.prisma.document.delete({ where: { id } })
  }

  private async optimizePdf(buffer: Buffer, dir: string): Promise<Buffer> {
    // Write input to a temp file, run ghostscript, read output back
    const tmpIn = path.join(dir, `tmp_in_${uuidv4()}.pdf`)
    const tmpOut = path.join(dir, `tmp_out_${uuidv4()}.pdf`)
    try {
      fs.writeFileSync(tmpIn, buffer, { mode: 0o640 })
      await execFileAsync('gs', [
        '-dBATCH',
        '-dNOPAUSE',
        '-dQUIET',
        '-dSAFER',               // disables filesystem access and external program execution
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dPDFSETTINGS=/ebook',  // 150 dpi — good for receipts/documents
        `-sOutputFile=${tmpOut}`,
        tmpIn,
      ], { timeout: 30_000 })
      const optimized = fs.readFileSync(tmpOut)
      // Only keep the optimized version if it's actually smaller
      return optimized.length < buffer.length ? optimized : buffer
    } catch (err) {
      this.logger.warn(`PDF optimization failed, storing original: ${err}`)
      return buffer
    } finally {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
    }
  }

}
