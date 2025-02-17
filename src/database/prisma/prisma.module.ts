import { Module, Global } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma/prisma.service';
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
