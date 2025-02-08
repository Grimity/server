import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';

@Injectable()
export class PostCommentRepository {
  constructor(private prisma: PrismaService) {}
}
