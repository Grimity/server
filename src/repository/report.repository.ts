import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';

@Injectable()
export class ReportRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: CreateInput) {
    await this.prisma.report.create({
      data: input,
      select: { id: true },
    });
    return;
  }
}

type CreateInput = {
  userId: string;
  type: number;
  refType: string;
  refId: string;
  content: string | null;
};
