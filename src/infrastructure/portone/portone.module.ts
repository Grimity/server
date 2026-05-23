import { Module } from '@nestjs/common';
import { PortOneService } from './portone.service';

@Module({
  providers: [PortOneService],
  exports: [PortOneService],
})
export class PortOneModule {}
