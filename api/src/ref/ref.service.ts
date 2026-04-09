import { Injectable } from '@nestjs/common'
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
}
