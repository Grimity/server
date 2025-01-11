import { Module, Global } from '@nestjs/common';
import { PrismaService } from 'src/provider/prisma.service';
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
