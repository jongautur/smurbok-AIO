import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RefService {
  constructor(private readonly prisma: PrismaService) {}

  getMakes() {
    return this.prisma.carMake.findMany({ orderBy: { name: 'asc' } })
  }

  getModels(makeId: number) {
    return this.prisma.carModel.findMany({
      where: { makeId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
  }

  async createMake(name: string) {
    const existing = await this.prisma.carMake.findUnique({ where: { name } })
    if (existing) throw new ConflictException(`Make "${name}" already exists`)
    return this.prisma.carMake.create({ data: { name } })
  }

  async deleteMake(makeId: number) {
    const make = await this.prisma.carMake.findUnique({ where: { id: makeId } })
    if (!make) throw new NotFoundException('Make not found')
    await this.prisma.carMake.delete({ where: { id: makeId } })
  }

  async createModel(makeId: number, name: string) {
    const make = await this.prisma.carMake.findUnique({ where: { id: makeId } })
    if (!make) throw new NotFoundException('Make not found')
    const existing = await this.prisma.carModel.findUnique({ where: { makeId_name: { makeId, name } } })
    if (existing) throw new ConflictException(`Model "${name}" already exists for this make`)
    return this.prisma.carModel.create({ data: { makeId, name } })
  }

  async deleteModel(modelId: number) {
    const model = await this.prisma.carModel.findUnique({ where: { id: modelId } })
    if (!model) throw new NotFoundException('Model not found')
    await this.prisma.carModel.delete({ where: { id: modelId } })
  }
}
