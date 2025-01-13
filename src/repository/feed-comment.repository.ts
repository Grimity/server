import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';

@Injectable()
export class FeedCommentRepository {
  constructor(private prisma: PrismaService) {}
}
